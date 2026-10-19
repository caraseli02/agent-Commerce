import type { ProductInterface } from '~~/types/product';
import { mockCatalogCollections, mockProducts } from '~~/server/utils/mockProducts';
import { defineAnonymousCatalogHandler } from '~~/server/utils/anonymousCatalogCache';

export default defineAnonymousCatalogHandler(
  'product-id',
  async ({ params }) => {
    const productId = params.id;
    const normalizedId = String(productId || '').toLowerCase();

    const tabHandlers: Record<string, () => unknown[]> = {
      featured: () => mockCatalogCollections.featured,
      'best-sellers': () => mockCatalogCollections.bestSellers,
      'hot-deals': () => mockCatalogCollections.hotDeals,
      'top-searched': () => mockCatalogCollections.topSearched,
    };

    if (tabHandlers[normalizedId]) {
      return {
        status: 'success',
        data: tabHandlers[normalizedId](),
      };
    }

    const product = (mockProducts as ProductInterface[]).find((p) => {
      const alias = String(p.alias || '').toLowerCase();
      const path = String(p.path || '').toLowerCase();
      const id = String(p._id || '').toLowerCase();
      return id === normalizedId || alias === normalizedId || path === normalizedId || path.endsWith(`/${normalizedId}`);
    });

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
  (params) => ({ ...params, id: (params.id || '').toLowerCase() }),
);
