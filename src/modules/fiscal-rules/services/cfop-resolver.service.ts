import { Injectable } from '@nestjs/common';

/**
 * Operações suportadas nesta fase (Fase 1 do plano fiscal). Cada uma define
 * o 2º-4º dígito do CFOP; o 1º dígito (5=intra, 6=inter, 7=exterior) é
 * derivado comparando UF de origem e destino.
 */
export type OperacaoFiscal = 'VENDA' | 'DEVOLUCAO_VENDA';

export interface ResolveCfopInput {
  operacao: OperacaoFiscal;
  ufOrigem: string;
  ufDestino: string;
  /** Destinatário é contribuinte de ICMS (Customer.indicadorIe === 1) */
  destinatarioContribuinte: boolean;
  /** Operação com consumidor final (Customer.consumidorFinal) */
  consumidorFinal: boolean;
}

export interface CfopResolvido {
  cfop: string;
  descricao: string;
  interestadual: boolean;
}

@Injectable()
export class CfopResolverService {
  /**
   * Resolve o CFOP de saída para as operações padrão de uma revenda de
   * mercadorias (o caso deste ERP — loja de revestimentos). Não cobre
   * remessa/bonificação/consignação; essas entram como novas operações
   * quando o negócio precisar.
   */
  resolve(input: ResolveCfopInput): CfopResolvido {
    const origem = (input.ufOrigem || '').trim().toUpperCase();
    const destino = (input.ufDestino || '').trim().toUpperCase();
    const interestadual = !!origem && !!destino && origem !== destino;
    const prefixo = interestadual ? '6' : '5';

    if (input.operacao === 'DEVOLUCAO_VENDA') {
      return {
        cfop: `${prefixo}202`,
        descricao:
          'Devolução de venda de mercadoria adquirida ou recebida de terceiros',
        interestadual,
      };
    }

    // VENDA
    if (
      interestadual &&
      input.consumidorFinal &&
      !input.destinatarioContribuinte
    ) {
      return {
        cfop: `${prefixo}108`,
        descricao:
          'Venda de mercadoria adquirida ou recebida de terceiros, destinada a consumidor final não contribuinte',
        interestadual,
      };
    }

    return {
      cfop: `${prefixo}102`,
      descricao: 'Venda de mercadoria adquirida ou recebida de terceiros',
      interestadual,
    };
  }
}
