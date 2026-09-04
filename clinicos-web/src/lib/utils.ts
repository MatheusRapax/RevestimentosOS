import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | Date) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * L8: formata campos "date-only" (previsão de entrega, data de emissão da NF,
 * chegada prevista...). O backend guarda esses valores como meia-noite UTC, então
 * formatar no fuso local (BRT −03:00) mostrava o dia anterior. Renderiza sempre a
 * data do calendário UTC. NÃO usar para timestamps reais (createdAt, deliveredAt).
 */
export function formatDateOnly(dateString?: string | Date | null) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
