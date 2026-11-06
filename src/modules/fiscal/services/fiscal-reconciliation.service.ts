import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  NotaRemota,
  EventoRemoto,
  planejarCancelamentoPendente,
  planejarReconciliacao,
} from './nexos-status';

const INTERVALO_PADRAO_MS = 5 * 60 * 1000;
const SOBREPOSICAO_MS = 2 * 60 * 1000; // relê um pouco antes do cursor: relógios diferentes não perdem nota
const PRIMEIRA_JANELA_MS = 7 * 24 * 60 * 60 * 1000; // sem cursor ainda: olha a última semana
const TAMANHO_PAGINA = 50;
const MAX_PAGINAS = 20;

export interface ResultadoReconciliacao {
  conferidas: number;
  atualizadas: number;
  cancelamentosPendentes: number;
}

/**
 * Rede de segurança dos webhooks (A7): a cada poucos minutos consulta GET /nfe?updatedSince= no serviço
 * fiscal e corrige o status local de qualquer nota que o webhook não tenha atualizado. O serviço tenta
 * o webhook 10 vezes (algumas horas); depois disso só esta consulta recupera.
 *
 * Só LÊ do serviço fiscal e só grava em FiscalDocument já existente (criado pela emissão do ERP).
 * Sem dependência de agendador: um timer simples; é idempotente, então duas instâncias não se atrapalham.
 */
@Injectable()
export class FiscalReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FiscalReconciliationService.name);
  private timer?: NodeJS.Timeout;
  private primeira?: NodeJS.Timeout;
  private rodando = false;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    const desligado =
      this.configService.get<string>('FISCAL_RECONCILE_ENABLED') === 'false' ||
      process.env.NODE_ENV === 'test';
    if (desligado) {
      this.logger.log('Reconciliação fiscal periódica desligada.');
      return;
    }
    const intervalo =
      Number(this.configService.get<string>('FISCAL_RECONCILE_INTERVAL_MS')) || INTERVALO_PADRAO_MS;
    this.primeira = setTimeout(() => void this.reconciliarTodas(), 30_000);
    this.timer = setInterval(() => void this.reconciliarTodas(), intervalo);
    this.timer.unref?.();
    this.primeira.unref?.();
    this.logger.log(`Reconciliação fiscal a cada ${Math.round(intervalo / 1000)} s.`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.primeira) clearTimeout(this.primeira);
  }

  /** Uma volta para todas as lojas que têm tenant fiscal. Nunca lança (é um job de fundo). */
  async reconciliarTodas(): Promise<void> {
    if (this.rodando) return;
    this.rodando = true;
    try {
      const configs = await this.prisma.clinicFiscalConfig.findMany({
        where: { nexosApiKey: { not: null } },
        select: { clinicId: true },
      });
      for (const { clinicId } of configs) {
        try {
          const r = await this.reconciliarClinica(clinicId);
          if (r.atualizadas > 0 || r.cancelamentosPendentes > 0) {
            this.logger.log(
              `Reconciliação loja ${clinicId}: ${r.atualizadas} nota(s) corrigida(s) de ${r.conferidas} conferida(s); ${r.cancelamentosPendentes} cancelamento(s) resolvido(s).`,
            );
          }
        } catch (e: any) {
          this.logger.warn(`Reconciliação da loja ${clinicId} falhou: ${e?.message || e}`);
        }
      }
    } catch (e: any) {
      this.logger.warn(`Reconciliação fiscal falhou: ${e?.message || e}`);
    } finally {
      this.rodando = false;
    }
  }

  async reconciliarClinica(clinicId: string): Promise<ResultadoReconciliacao> {
    const config = await this.prisma.clinicFiscalConfig.findUnique({ where: { clinicId } });
    const apiKey = config?.nexosApiKey || this.configService.get<string>('FISCAL_API_KEY');
    const apiUrl = this.configService.get<string>('FISCAL_MICROSERVICE_URL');
    if (!apiKey || !apiUrl) return { conferidas: 0, atualizadas: 0, cancelamentosPendentes: 0 };
    const headers = { 'X-API-Key': apiKey };

    const inicio = new Date(); // o próximo cursor: tudo que mudar depois disto será lido na volta seguinte
    const desde = new Date(
      (config?.lastReconciledAt ? config.lastReconciledAt.getTime() - SOBREPOSICAO_MS : inicio.getTime() - PRIMEIRA_JANELA_MS),
    );

    let conferidas = 0;
    let atualizadas = 0;

    for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
      const resp = await firstValueFrom(
        this.httpService.get(`${apiUrl}/nfe`, {
          headers,
          params: { updatedSince: desde.toISOString(), page: pagina, pageSize: TAMANHO_PAGINA },
        }),
      );
      const corpo = resp.data ?? {};
      const notas: NotaRemota[] = Array.isArray(corpo.data) ? corpo.data : [];

      for (const remota of notas) {
        conferidas++;
        const local = await this.prisma.fiscalDocument.findFirst({
          where: {
            clinicId,
            OR: [{ uuid: remota.id }, ...(remota.externalId ? [{ orderId: remota.externalId }] : [])],
          },
        });
        if (!local) continue; // nota que não nasceu de um pedido do ERP (ex.: teste direto na API)
        const dados = planejarReconciliacao(local, remota);
        if (dados) {
          await this.prisma.fiscalDocument.update({ where: { id: local.id }, data: dados });
          atualizadas++;
        }
      }

      const totalPaginas = Number(corpo.totalPages) || 1;
      if (pagina >= totalPaginas) break;
    }

    const cancelamentosPendentes = await this.conferirCancelamentosPendentes(clinicId, apiUrl, headers);

    await this.prisma.clinicFiscalConfig.update({
      where: { clinicId },
      data: { lastReconciledAt: inicio },
    });
    return { conferidas, atualizadas, cancelamentosPendentes };
  }

  /**
   * Cancelamento em andamento não depende de a nota ter mudado (o evento pode ser recusado sem
   * alterar a nota): consulta os eventos de cada nota nessa situação.
   */
  private async conferirCancelamentosPendentes(
    clinicId: string,
    apiUrl: string,
    headers: Record<string, string>,
  ): Promise<number> {
    const pendentes = await this.prisma.fiscalDocument.findMany({
      where: { clinicId, status: 'APPROVED', cancelRequestedAt: { not: null }, uuid: { not: null } },
    });
    let resolvidos = 0;
    for (const doc of pendentes) {
      try {
        const resp = await firstValueFrom(
          this.httpService.get(`${apiUrl}/nfe/${doc.uuid}/events`, { headers }),
        );
        const eventos: EventoRemoto[] = Array.isArray(resp.data) ? resp.data : resp.data?.data ?? [];
        const dados = planejarCancelamentoPendente(doc, eventos);
        if (dados) {
          await this.prisma.fiscalDocument.update({ where: { id: doc.id }, data: dados });
          resolvidos++;
        }
      } catch (e: any) {
        this.logger.warn(`Eventos da nota ${doc.id} indisponíveis: ${e?.message || e}`);
      }
    }
    return resolvidos;
  }
}
