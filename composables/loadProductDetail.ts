import type { ProductDetail, ProductDetailResponse } from '~/model/products/response/ProductDetailResponse';

export type ProductDetailLoader = (slug: string) => Promise<ProductDetailResponse>;

export function productDetailCacheKey(slug: string): string {
  return `product-detail-${slug}`;
}

export async function loadProductDetail(slug: string, fetchProduct: ProductDetailLoader): Promise<ProductDetail> {
  const response = await fetchProduct(slug);

  if (!response?.data) {
    throw new Error(`Product not found: ${slug}`);
  }

  return response.data;
}
