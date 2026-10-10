import { describe, expect, it } from 'vitest';
import { resolveOrderSummaryLineMoney } from '~~/helpers/order-summary-line-money';

const item = {
  id: 'prod-1',
  stock: 1,
  backorder_stock: 0,
  isFolder: false,
  initialUnitPrice: 999.99,
  unitPriceAfterDiscounts: 999.99,
  subtotal: 999.99,
  vatTotal: 0,
  total: 999.99,
  discount: { value: 0, startDate: '', endDate: '' },
};

describe('order summary line money', () => {
  it('uses the quantity-matched authoritative quote instead of stale cart money', () => {
    expect(
      resolveOrderSummaryLineMoney(
        item,
        {
          productId: 'prod-1',
          quantity: 1,
          listUnitPrice: 999.99,
          discountPercent: 5,
          discountTotal: 50,
          unitPrice: 949.99,
          lineTotal: 949.99,
          vatTotal: 180.5,
        },
        'stock',
      ),
    ).toEqual({ listUnitPrice: 999.99, unitPrice: 949.99, discountPercent: 5, subtotal: 949.99, vatTotal: 180.5 });
  });

  it('allocates a split quote line once across stock and backorder rows', () => {
    const splitItem = { ...item, stock: 1, backorder_stock: 2, subtotal: 300, vatTotal: 57 };
    const quote = {
      productId: 'prod-1',
      quantity: 3,
      listUnitPrice: 120,
      discountPercent: 10,
      discountTotal: 36,
      unitPrice: 108,
      lineTotal: 324,
      vatTotal: 61.56,
    };

    const stock = resolveOrderSummaryLineMoney(splitItem, quote, 'stock');
    const backorder = resolveOrderSummaryLineMoney(splitItem, quote, 'backorder');

    expect(stock).toMatchObject({ subtotal: 108, vatTotal: 20.52 });
    expect(backorder).toMatchObject({ subtotal: 216, vatTotal: 41.04 });
    expect(stock.subtotal + backorder.subtotal).toBe(quote.lineTotal);
    expect(stock.vatTotal + backorder.vatTotal).toBe(quote.vatTotal);
  });

  it('falls back to cart values when a quantity update invalidates the quote', () => {
    expect(
      resolveOrderSummaryLineMoney(
        { ...item, stock: 2, subtotal: 1_999.98, vatTotal: 380 },
        {
          productId: 'prod-1',
          quantity: 1,
          listUnitPrice: 999.99,
          discountPercent: 5,
          discountTotal: 50,
          unitPrice: 949.99,
          lineTotal: 949.99,
          vatTotal: 180.5,
        },
        'stock',
      ),
    ).toMatchObject({ unitPrice: 999.99, subtotal: 1_999.98, vatTotal: 380 });
  });

  it('keeps rounding remainders in the backorder allocation', () => {
    const splitItem = { ...item, stock: 1, backorder_stock: 2 };
    const quote = {
      productId: 'prod-1',
      quantity: 3,
      listUnitPrice: 0.01,
      discountPercent: 0,
      discountTotal: 0,
      unitPrice: 0.01,
      lineTotal: 0.03,
      vatTotal: 0.01,
    };
    expect(resolveOrderSummaryLineMoney(splitItem, quote, 'stock')).toMatchObject({ subtotal: 0.01, vatTotal: 0 });
    expect(resolveOrderSummaryLineMoney(splitItem, quote, 'backorder')).toMatchObject({ subtotal: 0.02, vatTotal: 0.01 });
  });
});
