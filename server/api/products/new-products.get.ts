import type { ProductInterface } from '~/model/products/response/ProductResponse';
import { mockProducts } from '~/server/utils/mockProducts';

export default defineEventHandler(async () => {
  const newProducts = (mockProducts as ProductInterface[]).filter((p) => p.class === 'Premium' || p.favourite === true).slice(0, 8);

  return {
    status: 'success',
    data: newProducts,
  };
});
