import type { ProductInterface } from '~/types/product';
import { mockProducts } from '~/server/utils/mockProducts';
import { defineAnonymousCatalogHandler } from '~/server/utils/anonymousCatalogCache';

export default defineAnonymousCatalogHandler(
  'product-path',
  async ({ params }) => {
    const path = params.path;
    const normalizedPath = String(path || '').toLowerCase();

    const tabHandlers: Record<string, () => unknown[]> = {
      featured: () => mockProducts.slice(0, 8),
      'best-sellers': () => mockProducts.slice(8, 16),
      'hot-deals': () => mockProducts.slice(16, 24),
      'top-searched': () => mockProducts.slice(0, 8),
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
