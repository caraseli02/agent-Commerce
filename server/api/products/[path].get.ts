import type { ProductInterface } from '~~/types/product';
import { mockCatalogProducts, mockProducts } from '~~/server/utils/mockProducts';
import { defineAnonymousCatalogHandler } from '~~/server/utils/anonymousCatalogCache';

export default defineAnonymousCatalogHandler(
  'product-path',
  async ({ params }) => {
    const path = params.path;
    const normalizedPath = String(path || '').toLowerCase();

    const tabHandlers: Record<string, () => unknown[]> = {
      featured: () => mockCatalogProducts.slice(0, 8),
      'best-sellers': () => mockCatalogProducts.slice(8, 16),
      'hot-deals': () => mockCatalogProducts.slice(16, 24),
      'top-searched': () => mockCatalogProducts.slice(0, 8),
    };

    if (tabHandlers[normalizedPath]) {
      return {
        status: 'success',
        data: tabHandlers[normalizedPath](),
      };
    }

    const product = (mockProducts as ProductInterface[]).find((p) => p.path === path);

    if (!product) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Product not found',
      });
    }

    return {
      status: 'success',
      data: product,
    };
  },
  (params) => {
    const path = params.path || '';
    const lower = path.toLowerCase();
    // Only tabs are case-insensitive; ordinary product paths remain exact-case.
    return ['featured', 'best-sellers', 'hot-deals', 'top-searched'].includes(lower) ? { ...params, path: lower } : params;
  },
);
