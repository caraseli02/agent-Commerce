import type { CartProductsInterface } from '~/types/cart';

const nonEmpty = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

/** Uses the immutable order-line snapshot before legacy embedded product data. */
export const resolveOrderLineIdentity = (item: CartProductsInterface) => ({
  name: nonEmpty(item.name) ?? nonEmpty(item.productEntity?.name),
  code: nonEmpty(item.code),
  description: nonEmpty(item.productEntity?.description),
  manufacturer: nonEmpty(item.productEntity?.manufacturer),
});
