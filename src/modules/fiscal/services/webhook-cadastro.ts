/**
 * Cadastro do webhook do ERP no NexosFiscal (contrato A17) e o segredo HMAC compartilhado com a rota que
 * recebe os eventos. Regras puras, sem acesso a banco ou rede.
 */

/** Valores de exemplo dos .env: nunca valem como segredo de verdade. */
export const SEGREDOS_DE_EXEMPLO = [
  'uma-senha-secreta-para-hmac',
  'troque-por-um-segredo-aleatorio-forte',
];

/**
 * Segredo HMAC do webhook. Em produção é obrigatório e não pode ser o de exemplo (null = recusar); fora
 * dela cai num valor fixo conhecido, para não quebrar o ambiente local (`padrao` = true).
 */
export function resolverSegredoWebhook(env: NodeJS.ProcessEnv = process.env): {
  segredo: string | null;
  padrao: boolean;
} {
  const definido = (env.FISCAL_WEBHOOK_SECRET || '').trim();
  if (definido && !SEGREDOS_DE_EXEMPLO.includes(definido)) {
    return { segredo: definido, padrao: false };
  }
  if (env.NODE_ENV === 'production') return { segredo: null, padrao: false };
  return { segredo: definido || SEGREDOS_DE_EXEMPLO[0], padrao: true };
}

const HOSTS_LOCAIS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];

/**
 * URL pública onde o serviço entrega os eventos. Vem sempre de FISCAL_WEBHOOK_URL (nunca fixa no código).
 * Em produção, um endereço local é erro: o serviço não alcançaria o ERP.
 */
export function validarUrlWebhook(
  valor: string | undefined,
  producao: boolean,
): { url: string; erro?: undefined } | { url?: undefined; erro: string } {
  const bruto = (valor || '').trim();
  if (!bruto) {
    return {
      erro: 'FISCAL_WEBHOOK_URL não está configurada no servidor: sem ela o serviço fiscal não tem para onde avisar das notas.',
    };
  }
  let url: URL;
  try {
    url = new URL(bruto);
  } catch {
    return { erro: `FISCAL_WEBHOOK_URL inválida ("${bruto}").` };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return {
      erro: 'FISCAL_WEBHOOK_URL precisa começar com https:// ou http://.',
    };
  }
  if (producao && HOSTS_LOCAIS.includes(url.hostname)) {
    return {
      erro: `FISCAL_WEBHOOK_URL aponta para ${url.hostname}: em produção ela precisa ser o endereço público do ERP.`,
    };
  }
  return { url: url.toString() };
}

export interface WebhookNoServico {
  id?: string;
  url?: string;
  eventType?: number | string;
  isActive?: boolean;
  createdAt?: string;
}

/** O serviço entrega tudo a esta URL? (registro ativo com eventType 0 / "All"). */
export function webhookDoErpAtivo(
  lista: WebhookNoServico[] | unknown,
  url: string,
): boolean {
  if (!Array.isArray(lista)) return false;
  return lista.some(
    (w: any) =>
      (w?.url ?? w?.Url) === url &&
      (w?.isActive ?? w?.IsActive) !== false &&
      [0, '0', 'All'].includes(w?.eventType ?? w?.EventType),
  );
}
