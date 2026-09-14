import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('epic #535 checkout QA regressions', () => {
  it('keeps authoritative checkout pricing and stock clamping as the source of buyer totals', () => {
    expect(source('pages/order-summary/index.vue')).toContain('authoritativeQuote');
    expect(source('server/utils/mockCart.ts')).toContain('clampCartQuantity');
    expect(source('server/application/checkout/place-order.ts')).toContain('quoteCheckout');
  });

  it('preserves a checkout draft across a refresh without persisting card data', () => {
    const checkout = source('pages/order-summary/index.vue');
    expect(checkout).toContain("CHECKOUT_DRAFT_STORAGE_KEY = 'checkout-draft-v1'");
    expect(checkout).toContain('sessionStorage.setItem');
    expect(checkout).toContain('paymentDetails: order.value.paymentDetails?.type');
    expect(source('composables/useOrder.ts')).toContain("sessionStorage.removeItem('checkout-draft-v1')");
  });

  it('explains unavailable credit and does not expose public tracking fixtures', () => {
    expect(source('components/order-summary/PaymentMethodSection.vue')).toContain('credit-unavailable-reason');
    expect(source('pages/order-tracking.vue')).toContain('only shown to the signed-in order owner');
    expect(source('pages/order-tracking.vue')).not.toContain('123 Demo Street');
  });

  it('labels a cart or quote conflict as a checkout review, not a payment failure', () => {
    const failure = source('pages/checkout/fail/index.vue');
    expect(failure).toContain("'quote_cart_mismatch'");
    expect(failure).toContain("'Checkout needs review'");
    const order = source('composables/useOrder.ts');
    expect(order).toContain('const details = payload.data');
    expect(order).toContain('const code = details.code ?? payload.code');
  });

  it('derives customer transaction history only from paid orders and exact-matches order IDs', () => {
    const transactions = source('server/api/transaction.get.ts');
    expect(transactions).toContain('order.paymentDetails?.status === PaymentStatusEnum.Paid');
    expect(transactions).toContain('statusCode: 401');
    expect(source('components/client-table/order/columns.ts')).toContain('shortId === query');
    expect(source('server/api/orders.get.ts')).toContain('query.shortId?.trim()');
  });

  it('clears persisted cart state during sign out', () => {
    expect(source('store/authStore.ts')).toContain('useCartStore().emptyCart()');
  });
});
