import { describe, expect, it } from 'vitest';
import { toCheckoutMoneyView, toPersistedOrderLineMoneyView } from '~/helpers/checkout-quote';

describe('checkout quote view model', () => {
  it('copies final payable money from the server quote without recalculating it', () => {
    const quote = {
      currency: 'RON' as const,
      merchandiseTotal: 949.99,
      discountTotal: 50,
      shippingTotal: 29.9,
      smallOrderCharge: 0,
      vatRate: 0.19,
      vatTotal: 180.5,
      grandTotal: 1160.39,
      smallOrderTier: null,
      lines: [],
    };

    expect(toCheckoutMoneyView(quote)).toEqual({
      currency: 'RON',
      subtotal: 949.99,
      discountAmount: 50,
      shippingCost: 29.9,
      smallOrderCharge: 0,
      vatRate: 0.19,
      vatAmount: 180.5,
      total: 1160.39,
    });
  });
});

describe('persisted order line money view', () => {
  it('copies persisted subtotal and allocated VAT without multiplying browser values', () => {
    expect(
      toPersistedOrderLineMoneyView({
        id: 'prod-1',
        stock: 99,
        backorder_stock: 4,
        isFolder: false,
        initialUnitPrice: 999.99,
        unitPriceAfterDiscounts: 949.99,
        subtotal: 949.99,
        vatTotal: 180.5,
        total: 1130.49,
        discount: { value: 5, startDate: '', endDate: '' },
      }),
    ).toEqual({ listUnitPrice: 999.99, unitPrice: 949.99, subtotal: 949.99, vatTotal: 180.5 });
  });

  it('derives only missing legacy line VAT from the stored subtotal and persisted order rate', () => {
    const legacyItem = {
      id: 'legacy',
      stock: 3,
      isFolder: false,
      initialUnitPrice: 10,
      unitPriceAfterDiscounts: 10,
      subtotal: 10,
      total: 11.9,
      discount: { value: 0, startDate: '', endDate: '' },
    };

    expect(toPersistedOrderLineMoneyView(legacyItem, 0.19).vatTotal).toBe(1.9);
  });
});
