import type { CartInterface } from '~/types/cart';

export type CartReadLoader = () => Promise<CartInterface | null>;

export function cartReadCacheKey(scope = 'default'): string {
  return `cart-read-${scope}`;
}

export async function loadCartRead(fetchCart: CartReadLoader): Promise<CartInterface | null> {
  return await fetchCart();
}
