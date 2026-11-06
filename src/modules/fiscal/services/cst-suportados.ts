// CST/CSOSN que o NexosFiscal sabe montar no XML (AJUSTES_ERP.md, A2). O ERP calcula mais tributos do que
// o serviço transmite (ST, redução de base, DIFAL, IPI, FCP); enquanto o serviço não suportar, uma regra
// que gere esses CST bloqueia a emissão com mensagem clara em vez de gerar um 400 incompreensível.

export const CST_ICMS_SUPORTADOS: Record<number, string[]> = {
  3: ['00', '40', '41', '50', '60'], // Regime Normal: CST (2 dígitos)
  1: ['102', '103', '300', '400', '500'], // Simples Nacional: CSOSN (3 dígitos)
  2: ['102', '103', '300', '400', '500'], // Simples, excesso de sublimite
};

export const CST_PIS_COFINS_SUPORTADOS = [
  '01',
  '02',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '49',
  '99',
];

export interface ImpostosDoItem {
  icms?: { cst?: string | null };
  pis?: { cst?: string | null };
  cofins?: { cst?: string | null };
}

/** Lista o que, nos impostos do item, o serviço fiscal ainda não consegue transmitir. */
export function cstNaoSuportados(
  crt: number | null | undefined,
  impostos: ImpostosDoItem,
): string[] {
  const problemas: string[] = [];

  const icms = String(impostos.icms?.cst ?? '').trim();
  const aceitosIcms = crt != null ? CST_ICMS_SUPORTADOS[crt] : undefined;
  if (aceitosIcms && !aceitosIcms.includes(icms)) {
    const tipo = crt === 3 ? 'CST' : 'CSOSN';
    problemas.push(
      `ICMS com ${tipo} "${icms || 'vazio'}" (aceitos neste regime: ${aceitosIcms.join(', ')})`,
    );
  }

  for (const [nome, cst] of [
    ['PIS', impostos.pis?.cst],
    ['COFINS', impostos.cofins?.cst],
  ] as const) {
    const v = String(cst ?? '').trim();
    if (!CST_PIS_COFINS_SUPORTADOS.includes(v)) {
      problemas.push(
        `${nome} com CST "${v || 'vazio'}" (aceitos: ${CST_PIS_COFINS_SUPORTADOS.join(', ')})`,
      );
    }
  }
  return problemas;
}

/** Tributos que o ERP calculou mas o serviço ainda não transmite (a nota sairia sem eles). */
export function tributosNaoTransmitidos(calculado?: {
  icmsSt?: unknown;
  fcp?: unknown;
  difal?: unknown;
  ipi?: unknown;
}): string[] {
  if (!calculado) return [];
  const nomes: [string, unknown][] = [
    ['ICMS-ST', calculado.icmsSt],
    ['FCP', calculado.fcp],
    ['DIFAL', calculado.difal],
    ['IPI', calculado.ipi],
  ];
  return nomes.filter(([, v]) => Boolean(v)).map(([n]) => n);
}
