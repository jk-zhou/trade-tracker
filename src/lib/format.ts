/**
 * Shared formatting utilities used across the application.
 * Centralizes currency and percentage formatting to avoid duplication.
 */

export function formatCurrency(
  val: number,
  minimumFractionDigits = 2
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
  }).format(val);
}

export function formatCurrencyCompact(val: number): string {
  return formatCurrency(val, 0);
}

export function formatPercent(
  val: number,
  minimumFractionDigits = 2
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits,
  }).format(val);
}
