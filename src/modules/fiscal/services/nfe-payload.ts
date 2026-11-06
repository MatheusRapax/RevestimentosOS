// Montagem dos campos fiscais do payload de emissão que vêm do cadastro/pedido (A1 do contrato
// NexosFiscal/docs/AJUSTES_ERP.md). Funções puras, sem Prisma nem HTTP.

export const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '');

/** Meios aceitos pelo NexosFiscal; o ERP só tem estes seis em `PaymentMethod`. */
const MEIO_POR_METODO: Record<string, string> = {
  PIX: 'PIX',
  CASH: 'DINHEIRO',
  CREDIT_CARD: 'CARTAO_CREDITO',
  DEBIT_CARD: 'CARTAO_DEBITO',
  BOLETO: 'BOLETO',
  TRANSFER: 'TED',
};

export interface PagamentoPedido {
  method: string;
  status: string;
  amountCents: number;
}

export interface FormaPagamento {
  meio: string;
  valor: number;
}

const reais = (cents: number) => Number((cents / 100).toFixed(2));

/**
 * Forma de pagamento real da nota, a partir dos pagamentos APROVADOS do pedido (agrupados por meio).
 * `fecha` diz se a soma bate com o total da nota (±1 centavo). Soma diferente devolve o que existe e
 * um aviso (o serviço também só avisa); sem pagamento aprovado vira SEM_PAGAMENTO com aviso.
 */
export function montarPagamento(
  pagamentos: PagamentoPedido[] | undefined | null,
  totalNotaCents: number,
): { formas: FormaPagamento[]; fecha: boolean; somaCents: number; avisos: string[] } {
  const aprovados = (pagamentos ?? []).filter((p) => p.status === 'APPROVED' && p.amountCents > 0);
  const porMeio = new Map<string, number>();
  for (const p of aprovados) {
    const meio = MEIO_POR_METODO[p.method];
    if (!meio) continue; // método desconhecido: não inventa um meio
    porMeio.set(meio, (porMeio.get(meio) ?? 0) + p.amountCents);
  }
  let formas = [...porMeio.entries()].map(([meio, cents]) => ({ meio, valor: reais(cents) }));
  const somaCents = [...porMeio.values()].reduce((s, c) => s + c, 0);
  const fecha = Math.abs(somaCents - totalNotaCents) <= 1;
  const avisos: string[] = [];

  if (formas.length === 0) {
    // O serviço recusa lista vazia e aceita SEM_PAGAMENTO com o valor total. Melhor que rotular
    // como PIX (o que o ERP fazia antes): a nota diz a verdade e o operador é avisado.
    formas = [{ meio: 'SEM_PAGAMENTO', valor: reais(totalNotaCents) }];
    avisos.push(
      'O pedido não tem pagamento aprovado registrado: a nota sairá com a forma de pagamento "sem pagamento".',
    );
  } else if (!fecha) {
    avisos.push(
      `Os pagamentos aprovados somam R$ ${reais(somaCents).toFixed(2)}, diferente do total da nota (R$ ${reais(totalNotaCents).toFixed(2)}).`,
    );
  }
  return { formas, fecha, somaCents, avisos };
}

/** GTIN válido para a NF-e: 8, 12, 13 ou 14 dígitos. Qualquer outra coisa não é enviada ("SEM GTIN"). */
export function gtinParaNota(gtin: unknown): string | undefined {
  const d = soDigitos(gtin);
  return [8, 12, 13, 14].includes(d.length) ? d : undefined;
}

/** Observações do pedido como informações complementares (limite do campo infCpl: 2000). */
export function informacoesComplementares(notes: unknown): string | undefined {
  const t = String(notes ?? '').replace(/\s+/g, ' ').trim();
  return t ? t.slice(0, 2000) : undefined;
}

/** Dados do destinatário que o serviço aceita desde a A1. */
export function dadosIeDestinatario(customer: {
  indicadorIe?: number | null;
  stateRegistration?: string | null;
}): { indicadorIe?: number; ie?: string } {
  const ind = customer?.indicadorIe;
  const out: { indicadorIe?: number; ie?: string } = {};
  if (ind === 1 || ind === 2 || ind === 9) out.indicadorIe = ind;
  // IE só acompanha o contribuinte (indicador 1): é obrigatória nele e o serviço recusa sem ela.
  const ie = soDigitos(customer?.stateRegistration);
  if (ind === 1 && ie) out.ie = ie;
  return out;
}
