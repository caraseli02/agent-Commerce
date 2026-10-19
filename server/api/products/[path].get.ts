import type { ProductInterface } from '~~/types/product';
import { mockCatalogCollections, mockProducts } from '~~/server/utils/mockProducts';
import { defineAnonymousCatalogHandler } from '~~/server/utils/anonymousCatalogCache';

export default defineAnonymousCatalogHandler(
  'product-path',
  async ({ params }) => {
    const path = params.path;
    const normalizedPath = String(path || '').toLowerCase();

    const tabHandlers: Record<string, () => unknown[]> = {
      featured: () => mockCatalogCollections.featured,
      'best-sellers': () => mockCatalogCollections.bestSellers,
      'hot-deals': () => mockCatalogCollections.hotDeals,
      'top-searched': () => mockCatalogCollections.topSearched,
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
