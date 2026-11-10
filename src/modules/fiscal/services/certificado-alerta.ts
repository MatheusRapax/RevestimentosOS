/**
 * Alerta de vencimento do certificado A1 (contrato A16 do NexosFiscal, evento CertificateExpiring).
 * Guardamos só a validade: os dias e o nível são sempre recalculados, porque o serviço avisa no máximo
 * 1x por semana e um "vence em 30 dias" gravado ficaria errado na tela dias depois.
 */

export type NivelCertificado = 'warning' | 'critical' | 'expired';

export interface AlertaCertificado {
  nivel: NivelCertificado;
  diasRestantes: number;
  notAfter: string;
  mensagem: string;
}

const MS_POR_DIA = 86_400_000;
const ONDE_ENVIAR = 'em Configuração Fiscal';

/** Data utilizável. O serviço manda 0001-01-01 quando não conseguiu ler o certificado. */
export function dataDeValidade(valor: unknown): Date | null {
  if (typeof valor !== 'string' && !(valor instanceof Date)) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime()) || data.getUTCFullYear() < 2000) return null;
  return data;
}

/** Mesmo cálculo do serviço: piso de dias UTC até o vencimento. */
export function diasAteVencer(
  notAfter: Date,
  agora: Date = new Date(),
): number {
  return Math.floor((notAfter.getTime() - agora.getTime()) / MS_POR_DIA);
}

/** Mesmas faixas do serviço: warning 16 a 60 dias, critical 1 a 15, expired 0 ou menos. */
export function nivelPelosDias(dias: number): NivelCertificado | null {
  if (dias <= 0) return 'expired';
  if (dias <= 15) return 'critical';
  if (dias <= 60) return 'warning';
  return null;
}

function emDias(dias: number): string {
  return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

function dataEmPortugues(data: Date): string {
  return data.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

/** Aviso a mostrar ao administrador, ou null se não há o que avisar. */
export function avaliarAlertaCertificado(
  notAfter: Date | null | undefined,
  agora: Date = new Date(),
): AlertaCertificado | null {
  if (!notAfter) return null;
  const diasRestantes = diasAteVencer(notAfter, agora);
  const nivel = nivelPelosDias(diasRestantes);
  if (!nivel) return null;

  let mensagem: string;
  if (nivel !== 'expired') {
    mensagem = `Certificado digital vence em ${emDias(diasRestantes)}: renove e envie o novo A1 ${ONDE_ENVIAR}.`;
  } else if (notAfter.getTime() > agora.getTime()) {
    mensagem = `Certificado digital vence hoje: depois disso nenhuma nota será emitida até enviar um certificado novo ${ONDE_ENVIAR}.`;
  } else {
    mensagem = `Certificado digital vencido desde ${dataEmPortugues(notAfter)}: nenhuma nota será emitida até enviar um certificado novo ${ONDE_ENVIAR}.`;
  }
  return { nivel, diasRestantes, notAfter: notAfter.toISOString(), mensagem };
}

/**
 * Lê o corpo do webhook. O serviço envia este evento em PascalCase (docs/WEBHOOKS.md do NexosFiscal),
 * enquanto o resumo do contrato o descreve em camelCase: aceitamos os dois.
 */
export function lerEventoCertificado(
  data: any,
): { tenantId: string; notAfter: Date } | null {
  const tenantId = data?.TenantId ?? data?.tenantId;
  const notAfter = dataDeValidade(data?.NotAfter ?? data?.notAfter);
  if (typeof tenantId !== 'string' || !tenantId || !notAfter) return null;
  return { tenantId, notAfter };
}

/**
 * Alertas do certificado na tela de status (GET /sefaz/status). Usa daysLeft/level do serviço; se ele
 * ainda não os enviar (versão antiga), calcula pela validade.
 */
export function alertasDoStatus(
  c: any,
  agora: Date = new Date(),
): {
  daysLeft: number | null;
  level: string | null;
  alertas: { nivel: 'erro' | 'aviso'; mensagem: string }[];
} {
  const notAfter = dataDeValidade(c?.notAfterUtc);
  const daysLeft =
    typeof c?.daysLeft === 'number' && notAfter
      ? c.daysLeft
      : notAfter
        ? diasAteVencer(notAfter, agora)
        : null;
  const level: string | null =
    c?.level ??
    (c?.expired === true
      ? 'expired'
      : daysLeft !== null
        ? (nivelPelosDias(daysLeft) ?? 'ok')
        : null);

  const alertas: { nivel: 'erro' | 'aviso'; mensagem: string }[] = [];
  if (level === 'expired') {
    alertas.push({
      nivel: 'erro',
      mensagem:
        'O certificado digital está VENCIDO: nenhuma nota será emitida até enviar um certificado novo.',
    });
  } else if (level === 'invalid') {
    alertas.push({
      nivel: 'erro',
      mensagem:
        'O serviço fiscal não conseguiu ler o certificado (senha ou arquivo inválido): envie o certificado de novo.',
    });
  } else if (level === 'not_yet_valid') {
    alertas.push({
      nivel: 'erro',
      mensagem:
        'O certificado digital ainda não começou a valer: as notas serão recusadas até a data de início.',
    });
  } else if (
    (level === 'warning' || level === 'critical') &&
    daysLeft !== null
  ) {
    alertas.push({
      nivel: 'aviso',
      mensagem: `Certificado digital vence em ${emDias(daysLeft)}: renove e envie o novo A1.`,
    });
  }
  return { daysLeft, level, alertas };
}
