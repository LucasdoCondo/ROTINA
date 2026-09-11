/** Utilitários de formatação (pt-BR) compartilhados pelas páginas. */

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/** Decimal(14,2) do backend chega como string no JSON → normaliza aqui. */
export function formatMoney(value: string | number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value));
}
