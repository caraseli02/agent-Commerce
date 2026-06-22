import type { ProductInterface } from '~/model/products/response/ProductResponse';
import { mockProducts } from '~/server/utils/mockProducts';

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path');
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
});
