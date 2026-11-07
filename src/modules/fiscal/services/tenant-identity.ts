import { BadRequestException } from '@nestjs/common';

/** Primeiros 2 dígitos do código IBGE do município = código numérico da UF. */
export const UF_CODIGO: Record<string, string> = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17',
  MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27',
  SE: '28', BA: '29', MG: '31', ES: '32', RJ: '33', SP: '35', PR: '41',
  SC: '42', RS: '43', MS: '50', MT: '51', GO: '52', DF: '53',
};

export interface PerfilEmitente {
  cnpj?: string | null;
  ie?: string | null;
  im?: string | null;
  crt?: number | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipioIbge?: string | null;
  municipioNome?: string | null;
  uf?: string | null;
  cep?: string | null;
}

export interface IdentidadeTenant {
  cnpj: string;
  ie?: string;
  im?: string;
  crt: number;
  uf: string;
  cityCode: string;
  address: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    cep: string;
  };
}

const onlyDigits = (v?: string | null) => (v ?? '').replace(/\D/g, '');
const clean = (v?: string | null) => (v ?? '').trim();

export function formatCnpj(cnpj: string): string {
  const d = onlyDigits(cnpj);
  return d.length === 14
    ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : cnpj;
}

/** IE: "ISENTO" ou só dígitos (2 a 14). Vazia vira undefined. Lança se inválida. */
export function normalizarIe(ie?: string | null): string | undefined {
  const v = clean(ie);
  if (!v) return undefined;
  if (/^isento$/i.test(v)) return 'ISENTO';
  const d = onlyDigits(v);
  if (!/^\d{2,14}$/.test(d)) {
    throw new BadRequestException(
      'Inscrição Estadual inválida no Perfil do Emitente: informe somente números (2 a 14 dígitos) ou ISENTO.',
    );
  }
  return d;
}

/**
 * Monta a identidade que o NexosFiscal precisa (POST/PUT /tenants) a partir do
 * Perfil do Emitente — a fonte da verdade. Nada é "adivinhado": faltou dado,
 * erro claro em português. Devolve também avisos (não bloqueiam).
 */
export function montarIdentidadeTenant(perfil: PerfilEmitente): {
  identidade: IdentidadeTenant;
  avisos: string[];
} {
  const avisos: string[] = [];

  const cnpj = onlyDigits(perfil.cnpj);
  if (cnpj.length !== 14) {
    throw new BadRequestException(
      'CNPJ do Perfil do Emitente ausente ou inválido (14 dígitos).',
    );
  }

  const uf = clean(perfil.uf).toUpperCase();
  if (!UF_CODIGO[uf]) {
    throw new BadRequestException(
      'UF do Perfil do Emitente ausente ou inválida (2 letras, ex.: MA).',
    );
  }

  const cityCode = onlyDigits(perfil.municipioIbge);
  if (cityCode.length !== 7) {
    throw new BadRequestException(
      'Código IBGE do município ausente no Perfil do Emitente (7 dígitos).',
    );
  }
  if (!cityCode.startsWith(UF_CODIGO[uf])) {
    throw new BadRequestException(
      `Código IBGE ${cityCode} não pertence à UF ${uf} do Perfil do Emitente.`,
    );
  }

  // Sem padrão silencioso: CRT ausente é erro, não "3".
  const crt = perfil.crt;
  if (crt !== 1 && crt !== 2 && crt !== 3) {
    throw new BadRequestException(
      'Regime Tributário (CRT) não informado no Perfil do Emitente. Escolha o regime (1, 2 ou 3) e salve o perfil.',
    );
  }

  const ie = normalizarIe(perfil.ie);
  if (!ie) {
    avisos.push('Inscrição Estadual não informada no Perfil do Emitente.');
  } else if (ie === 'ISENTO') {
    avisos.push(
      'A Inscrição Estadual está como ISENTO. Empresa que vende mercadoria costuma ser contribuinte do ICMS e ter IE; confirme com o contador.',
    );
  }

  const im = clean(perfil.im) || undefined;
  if (im && im.length > 20) {
    throw new BadRequestException(
      'Inscrição Municipal do Perfil do Emitente passa de 20 caracteres.',
    );
  }

  // Endereço (o transmissor real exige)
  const faltando: string[] = [];
  const logradouro = clean(perfil.logradouro);
  const numero = clean(perfil.numero);
  const bairro = clean(perfil.bairro);
  const municipio = clean(perfil.municipioNome);
  const cep = onlyDigits(perfil.cep);
  if (!logradouro) faltando.push('Logradouro');
  if (!numero) faltando.push('Número');
  if (!bairro) faltando.push('Bairro');
  if (!municipio) faltando.push('Município');
  if (cep.length !== 8) faltando.push('CEP (8 dígitos)');
  if (faltando.length) {
    throw new BadRequestException(
      `Endereço do emitente incompleto no Perfil do Emitente: faltam ${faltando.join(', ')}.`,
    );
  }

  const complemento = clean(perfil.complemento) || undefined;
  const campos: [string, string | undefined][] = [
    ['Logradouro', logradouro],
    ['Número', numero],
    ['Complemento', complemento],
    ['Bairro', bairro],
    ['Município', municipio],
  ];
  for (const [rotulo, valor] of campos) {
    if (valor && valor.length > 60) {
      throw new BadRequestException(
        `${rotulo} do Perfil do Emitente passa de 60 caracteres (limite da NF-e). Abrevie e salve o perfil.`,
      );
    }
  }
  if (logradouro.includes('/')) {
    avisos.push(
      `O logradouro contém "/" ("${logradouro}"): parece a junção de dois endereços. Confira como deve sair na NF-e.`,
    );
  }

  return {
    identidade: {
      cnpj,
      ie,
      im,
      crt,
      uf,
      cityCode,
      address: { logradouro, numero, complemento, bairro, municipio, cep },
    },
    avisos,
  };
}

/**
 * Compara o que veio digitado no Setup (campos opcionais) com o Perfil.
 * O perfil manda: divergência vira erro explícito, nunca sobrescrita silenciosa.
 */
export function divergenciasSetupVsPerfil(
  form: { document?: string; ie?: string; uf?: string; cityCode?: string; crt?: string },
  perfil: PerfilEmitente,
): string[] {
  const out: string[] = [];
  const doc = onlyDigits(form.document);
  if (doc && doc !== onlyDigits(perfil.cnpj)) {
    out.push(`CNPJ (Setup ${formatCnpj(doc)} × Perfil ${formatCnpj(onlyDigits(perfil.cnpj))})`);
  }
  const uf = clean(form.uf).toUpperCase();
  if (uf && uf !== clean(perfil.uf).toUpperCase()) {
    out.push(`UF (Setup ${uf} × Perfil ${clean(perfil.uf).toUpperCase() || '—'})`);
  }
  const city = onlyDigits(form.cityCode);
  if (city && city !== onlyDigits(perfil.municipioIbge)) {
    out.push(`código IBGE (Setup ${city} × Perfil ${onlyDigits(perfil.municipioIbge) || '—'})`);
  }
  const crt = Number(form.crt);
  if (form.crt && crt && crt !== perfil.crt) {
    out.push(`regime/CRT (Setup ${crt} × Perfil ${perfil.crt ?? '—'})`);
  }
  const ie = clean(form.ie);
  if (ie) {
    let a: string | undefined;
    try { a = normalizarIe(ie); } catch { a = ie; }
    let b: string | undefined;
    try { b = normalizarIe(perfil.ie); } catch { b = clean(perfil.ie); }
    if (a !== b) out.push(`Inscrição Estadual (Setup ${ie} × Perfil ${clean(perfil.ie) || '—'})`);
  }
  return out;
}
