import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

export interface TaxContext {
  clinicId: string;
  ufOrigem: string;
  ufDestino: string;
  regime: number; // CRT do emitente: 1/2=Simples, 3=Normal
  consumidorFinal: boolean;
  contribuinte: boolean; // destinatário é contribuinte de ICMS?
}

export interface TaxItemInput {
  ncm: string | null;
  origin: number | null;
  baseCalculo: number; // valor do item em reais (valorTotal)
}

export interface TaxResult {
  icms: {
    cst: string;
    modBC: number;
    aliquota: number;
    reducaoBase: number;
    vBC: number;
    vICMS: number;
  };
  icmsSt?: { vBcSt: number; vIcmsSt: number; mva: number };
  fcp?: { aliquota: number; vFcp: number };
  difal?: {
    aliquotaInterestadual: number;
    aliquotaInterna: number;
    vIcmsUfDestino: number;
    vIcmsUfRemetente: number;
  };
  pis: { cst: string; aliquota: number; vBC: number; vPIS: number };
  cofins: { cst: string; aliquota: number; vBC: number; vCOFINS: number };
  ipi?: { cst: string; aliquota: number; vBC: number; vIPI: number };
  /** codigo das regras usadas — rastreabilidade p/ a tela de revisão */
  regrasAplicadas: string[];
  /** cenários sem regra cadastrada — não bloqueiam, mas precisam de atenção */
  avisos: string[];
}

@Injectable()
export class TaxCalculatorService {
  private readonly logger = new Logger(TaxCalculatorService.name);

  constructor(private prisma: PrismaService) {}

  async calcular(ctx: TaxContext, item: TaxItemInput): Promise<TaxResult> {
    const avisos: string[] = [];
    const regrasAplicadas: string[] = [];
    const now = new Date();
    const vigente = {
      vigenciaInicio: { lte: now },
      OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: now } }],
    };

    // ── ICMS ──
    const icmsCandidatas = await this.prisma.regraIcms.findMany({
      where: {
        regime: ctx.regime,
        AND: [
          vigente,
          { OR: [{ clinicId: ctx.clinicId }, { clinicId: null }] },
          {
            OR: [
              { ufOrigem: ctx.ufOrigem, ufDestino: ctx.ufDestino },
              {
                ufOrigem: null,
                ufDestino: null,
                mesmaUf:
                  ctx.ufOrigem && ctx.ufDestino
                    ? ctx.ufOrigem.toUpperCase() === ctx.ufDestino.toUpperCase()
                    : undefined,
              },
            ],
          },
          { OR: [{ ncm: item.ncm }, { ncm: null }] },
          { OR: [{ origemMercadoria: item.origin }, { origemMercadoria: null }] },
          {
            OR: [
              { consumidorFinal: ctx.consumidorFinal },
              { consumidorFinal: null },
            ],
          },
          { OR: [{ contribuinte: ctx.contribuinte }, { contribuinte: null }] },
        ],
      },
    });

    const icmsRule = this.maisEspecifica(icmsCandidatas, ctx.clinicId);
    const interestadual =
      ctx.ufOrigem?.toUpperCase() !== ctx.ufDestino?.toUpperCase();

    let icms: TaxResult['icms'];
    let icmsSt: TaxResult['icmsSt'];
    let fcp: TaxResult['fcp'];
    let difal: TaxResult['difal'];

    if (!icmsRule) {
      avisos.push(
        `Nenhuma regra de ICMS cadastrada para regime=${ctx.regime}, ${ctx.ufOrigem}→${ctx.ufDestino}, NCM=${item.ncm}. Usando 0% até a tabela ser configurada.`,
      );
      icms = {
        cst: '00',
        modBC: 0,
        aliquota: 0,
        reducaoBase: 0,
        vBC: item.baseCalculo,
        vICMS: 0,
      };
    } else {
      regrasAplicadas.push(icmsRule.codigo || icmsRule.id);
      const reducao = icmsRule.reducaoBase || 0;
      const vBC = Math.round(item.baseCalculo * (1 - reducao / 100) * 100) / 100;
      const vICMS = Math.round(vBC * (icmsRule.aliquota / 100) * 100) / 100;
      icms = {
        cst: icmsRule.cst,
        modBC: icmsRule.modBC,
        aliquota: icmsRule.aliquota,
        reducaoBase: reducao,
        vBC,
        vICMS,
      };

      if (icmsRule.temSt && icmsRule.mvaSt != null) {
        const vBcSt =
          Math.round(vBC * (1 + icmsRule.mvaSt / 100) * 100) / 100;
        const aliqInterna = icmsRule.aliquotaInterna ?? icmsRule.aliquota;
        const vIcmsStBruto = vBcSt * (aliqInterna / 100);
        icmsSt = {
          vBcSt,
          vIcmsSt: Math.max(0, Math.round((vIcmsStBruto - vICMS) * 100) / 100),
          mva: icmsRule.mvaSt,
        };
      }

      if (icmsRule.aliquotaFcp) {
        fcp = {
          aliquota: icmsRule.aliquotaFcp,
          vFcp: Math.round(vBC * (icmsRule.aliquotaFcp / 100) * 100) / 100,
        };
      }

      if (interestadual && ctx.consumidorFinal && icmsRule.aliquotaInterna) {
        // DIFAL simplificado (partilha extinta em 2024 p/ não-Simples: 100% ao destino).
        // Valor calculado para referência/relatório — o payload atual do
        // NexosFiscal ainda não recebe estes campos (ver observação no PR).
        const vUfDest =
          Math.round(
            vBC * ((icmsRule.aliquotaInterna - icms.aliquota) / 100) * 100,
          ) / 100;
        difal = {
          aliquotaInterestadual: icms.aliquota,
          aliquotaInterna: icmsRule.aliquotaInterna,
          vIcmsUfDestino: Math.max(0, vUfDest),
          vIcmsUfRemetente: 0,
        };
      }
    }

    // ── PIS/COFINS ──
    const pisCofinsCandidatas = await this.prisma.regraPisCofins.findMany({
      where: {
        regime: ctx.regime,
        AND: [vigente, { OR: [{ clinicId: ctx.clinicId }, { clinicId: null }] }],
      },
    });
    const pisCofinsRule = this.maisEspecifica(pisCofinsCandidatas, ctx.clinicId);

    let pis: TaxResult['pis'];
    let cofins: TaxResult['cofins'];
    if (!pisCofinsRule) {
      avisos.push(
        `Nenhuma regra de PIS/COFINS cadastrada para regime=${ctx.regime}. Usando 0% até a tabela ser configurada.`,
      );
      pis = { cst: '08', aliquota: 0, vBC: item.baseCalculo, vPIS: 0 };
      cofins = { cst: '08', aliquota: 0, vBC: item.baseCalculo, vCOFINS: 0 };
    } else {
      regrasAplicadas.push(pisCofinsRule.codigo || pisCofinsRule.id);
      pis = {
        cst: pisCofinsRule.cst,
        aliquota: pisCofinsRule.aliquotaPis,
        vBC: item.baseCalculo,
        vPIS:
          Math.round(item.baseCalculo * (pisCofinsRule.aliquotaPis / 100) * 100) /
          100,
      };
      cofins = {
        cst: pisCofinsRule.cst,
        aliquota: pisCofinsRule.aliquotaCofins,
        vBC: item.baseCalculo,
        vCOFINS:
          Math.round(
            item.baseCalculo * (pisCofinsRule.aliquotaCofins / 100) * 100,
          ) / 100,
      };
    }

    // ── IPI ── (revenda não-industrial: sem regra cadastrada = fora do grupo IPI)
    let ipi: TaxResult['ipi'];
    if (item.ncm) {
      const ipiRule = await this.prisma.regraIpi.findFirst({
        where: {
          ncm: item.ncm,
          AND: [vigente, { OR: [{ clinicId: ctx.clinicId }, { clinicId: null }] }],
        },
        orderBy: { clinicId: 'desc' }, // override de loja primeiro (não-null antes de null)
      });
      if (ipiRule) {
        regrasAplicadas.push(ipiRule.codigo || ipiRule.id);
        ipi = {
          cst: ipiRule.cst,
          aliquota: ipiRule.aliquota,
          vBC: item.baseCalculo,
          vIPI:
            Math.round(item.baseCalculo * (ipiRule.aliquota / 100) * 100) / 100,
        };
      }
    }

    return { icms, icmsSt, fcp, difal, pis, cofins, ipi, regrasAplicadas, avisos };
  }

  /**
   * Entre as regras candidatas (todas batem os filtros exatos/nulos), escolhe
   * a mais específica: override da própria loja vence; entre regras globais,
   * mais campos preenchidos (não-null) = mais específica.
   */
  private maisEspecifica<
    T extends {
      clinicId?: string | null;
      ncm?: string | null;
      origemMercadoria?: number | null;
      consumidorFinal?: boolean | null;
      contribuinte?: boolean | null;
      ufOrigem?: string | null;
      ufDestino?: string | null;
    },
  >(candidatas: T[], clinicId: string): T | null {
    if (candidatas.length === 0) return null;
    const score = (r: T) => {
      let s = r.clinicId === clinicId && r.clinicId != null ? 1000 : 0;
      if (r.ufOrigem != null) s += 16;
      if (r.ncm != null) s += 8;
      if (r.origemMercadoria != null) s += 4;
      if (r.consumidorFinal != null) s += 2;
      if (r.contribuinte != null) s += 1;
      return s;
    };
    return candidatas.reduce((best, cur) =>
      score(cur) > score(best) ? cur : best,
    );
  }
}
