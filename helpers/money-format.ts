/** Non-breaking space, so the currency never wraps onto its own line. */
const NBSP = String.fromCharCode(160);

/** Formats a RON amount for storefront display with exactly two decimals. */
export const formatLei = (amount: number | string | null | undefined): string => {
  const value = Number(amount);
  return `${(Number.isFinite(value) ? value : 0).toFixed(2)}${NBSP}Lei`;
};
