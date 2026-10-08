import type { ProductInterface } from '~/types/product';
import { mockProducts } from '~/server/utils/mockProducts';
import { defineAnonymousCatalogHandler } from '~/server/utils/anonymousCatalogCache';

export default defineAnonymousCatalogHandler('product-id', async ({ params }) => {
  const productId = params.id;
  const normalizedId = String(productId || '').toLowerCase();

  const tabHandlers: Record<string, () => unknown[]> = {
    featured: () => mockProducts.slice(0, 8),
    'best-sellers': () => mockProducts.slice(8, 16),
    'hot-deals': () => mockProducts.slice(16, 24),
    'top-searched': () => mockProducts.slice(0, 8),
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
});
