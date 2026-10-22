import type { ProductInterface } from '~~/types/product';

type DatasheetSource = Pick<ProductInterface, 'details'> | null | undefined;

/** Raw datasheet reference from the catalog. Empty for products that are not electronic components. */
export function getProductDatasheet(product: DatasheetSource): string {
  return product?.details?.SummaryData?.Datasheet?.trim() ?? '';
}

/** A datasheet is only linkable when the catalog holds a real URL or site path, not a bare file name. */
export function getProductDatasheetUrl(product: DatasheetSource): string | null {
  const datasheet = getProductDatasheet(product);
  return /^(https?:\/\/|\/)/i.test(datasheet) ? datasheet : null;
}
