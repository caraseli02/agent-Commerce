import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { cartReadCacheKey, loadCartRead } from '~/composables/loadCartRead';
import type { CartInterface } from '~/types/cart';

const orderSummaryPath = resolve('pages/order-summary/index.vue');

describe('cart read useAsyncData contract', () => {
  it('loads order-summary cart through useAsyncData with a stable cache key', () => {
    const orderSummaryPage = readFileSync(orderSummaryPath, 'utf8');

    expect(orderSummaryPage).toContain("cartReadCacheKey('order-summary')");
    expect(orderSummaryPage).toContain('server: false');
    expect(orderSummaryPage).toContain('loadCartRead(() => refreshCart())');
    expect(orderSummaryPage).toContain('cartReadPending');
    expect(orderSummaryPage).toContain('cartReadError');
    expect(orderSummaryPage).toContain('refreshCartRead()');
    expect(orderSummaryPage).not.toContain('fetchCartList');
    expect(orderSummaryPage).not.toContain('fetchList(), // Fetch cart items');
  });

  it('builds deterministic cart read cache keys', () => {
    expect(cartReadCacheKey('order-summary')).toBe('cart-read-order-summary');
    expect(cartReadCacheKey('default')).toBe('cart-read-default');
  });

  it('returns cart data from the loader', async () => {
    const cart = { _id: 'cart-1', products: [] } as unknown as CartInterface;
    const fetchCart = vi.fn().mockResolvedValue(cart);

    await expect(loadCartRead(fetchCart)).resolves.toEqual(cart);
  });
});
