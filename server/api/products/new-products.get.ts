import type { ProductInterface } from '~/types/product';
import { mockProducts } from '~/server/utils/mockProducts';
import { defineAnonymousCatalogHandler } from '~/server/utils/anonymousCatalogCache';

export default defineAnonymousCatalogHandler('new-products', async () => {
  const newProducts = (mockProducts as ProductInterface[]).filter((p) => p.class === 'Premium' || p.favourite === true).slice(0, 8);

  return {
    status: 'success',
    data: newProducts,
  };
});
