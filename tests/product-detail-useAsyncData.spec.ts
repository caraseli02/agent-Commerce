import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { loadProductDetail, productDetailCacheKey } from '~/composables/loadProductDetail';
import type { ProductDetail } from '~/types/product';

const productPagePath = resolve('pages/product/[slug].vue');
const productsApiPath = resolve('composables/api/products.ts');

describe('product detail useAsyncData contract', () => {
  it('uses the request-context fetch for mock SSR product loads', () => {
    const productsApi = readFileSync(productsApiPath, 'utf8');

    expect(productsApi).toContain('if (config.public.MOCK_MODE && import.meta.server)');
    expect(productsApi).toContain('const requestFetch = useRequestFetch()');
    expect(productsApi).toContain('`/api${RESOURCE}/${id}`');
    expect(productsApi).toContain('$apiClient<ProductDetailResponse>');
  });

  it('uses a stable cache key per slug and watches route slug changes', () => {
    const productPage = readFileSync(productPagePath, 'utf8');

    expect(productPage).toContain("productDetailCacheKey(productSlug.value ?? '')");
    expect(productPage).toContain('watch: [productSlug]');
    expect(productPage).toContain("loadProductBySlug(productSlug.value ?? '')");
    expect(productPage).toContain('useProducts');
    expect(productPage).toContain('v-if="pending"');
    expect(productPage).toContain('v-else-if="error"');
    expect(productPage).toContain('role="alert"');
    expect(productPage).not.toContain('const product = ref<ProductDetail | null>(null)');
    expect(productPage).not.toContain('as unknown as ProductInterface');
  });

  it('builds deterministic cache keys from slug values', () => {
    expect(productDetailCacheKey('prod-1')).toBe('product-detail-prod-1');
    expect(productDetailCacheKey('stm32f407vgt6')).toBe('product-detail-stm32f407vgt6');
  });

  it('returns product data from a successful response', async () => {
    const product = { _id: 'prod-1', name: 'Mock product' } as ProductDetail;
    const fetchProduct = vi.fn().mockResolvedValue({ status: 'success', data: product });

    await expect(loadProductDetail('prod-1', fetchProduct)).resolves.toEqual(product);
    expect(fetchProduct).toHaveBeenCalledWith('prod-1');
  });

  it('throws when the API returns no product data', async () => {
    const fetchProduct = vi.fn().mockResolvedValue({ status: 'success', data: null });

    await expect(loadProductDetail('missing-product', fetchProduct)).rejects.toThrow('Product not found: missing-product');
  });
});
