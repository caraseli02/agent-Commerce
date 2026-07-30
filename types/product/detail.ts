import type { ProductInterface } from './response';

/**
 * Canonical product detail shape for the Scripted Buyer Path read path.
 * Mock/live product detail APIs return the same contract as list/search products.
 */
export type ProductDetail = ProductInterface;

export interface ProductDetailResponse {
  status: string;
  data: ProductDetail;
}
