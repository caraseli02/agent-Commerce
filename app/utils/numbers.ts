export function formatNumberWithCommas(number: number, prefix = ''): string {
  const [wholePart = '0', decimalPart = '00'] = number.toFixed(2).split('.');
  const formattedWholePart = parseInt(wholePart, 10).toLocaleString('en-US');
  return prefix ? `${prefix} ${formattedWholePart}.${decimalPart}` : `${formattedWholePart}.${decimalPart}`;
}

// Storefront money format: amount with two decimals, then the currency ("1499.99 Lei").
export function formatLei(amount: unknown): string {
  const value = Number(amount);
  return `${(Number.isFinite(value) ? value : 0).toFixed(2)} Lei`;
}

// Order references arrive as "#953775", "ORD-953775" or "ORD-2024-0030"; show one shape.
export function formatOrderRef(ref: unknown): string {
  const cleaned = String(ref ?? '')
    .trim()
    .replace(/^#/, '')
    .replace(/^ORD-/i, '');
  return cleaned ? `ORD-${cleaned}` : 'N/A';
}
