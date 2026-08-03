import { describe, expect, it } from 'vitest';
import { calculateOrderMoney, resolveSmallOrderCharge } from '../helpers/order-money';

const smallOrderTiers = [
  { _id: 'soc-001', min: 0, max: 50, price: 4.99 },
  { _id: 'soc-002', min: 50, max: 100, price: 2.5 },
];

describe('order money module', () => {
  it('resolves small-order tiers at inclusive min and exclusive max boundaries', () => {
    expect(resolveSmallOrderCharge(0, smallOrderTiers)).toEqual({
      charge: 4.99,
      tier: smallOrderTiers[0],
    });
    expect(resolveSmallOrderCharge(49.99, smallOrderTiers)).toEqual({
      charge: 4.99,
      tier: smallOrderTiers[0],
    });
    expect(resolveSmallOrderCharge(50, smallOrderTiers)).toEqual({
      charge: 2.5,
      tier: smallOrderTiers[1],
    });
    expect(resolveSmallOrderCharge(100, smallOrderTiers)).toEqual({
      charge: 0,
      tier: null,
    });
  });

  it('applies default VAT on merchandise subtotal only', () => {
    const result = calculateOrderMoney({
      subtotal: 100,
      shippingCost: 19,
      discountAmount: 5,
      smallOrderTiers,
    });

    expect(result).toMatchObject({
      subtotal: 100,
      discountAmount: 5,
      smallOrderCharge: 0,
      shippingCost: 19,
      vatRate: 0.19,
      vatAmount: 19,
      grandTotal: 133,
      matchedSmallOrderTier: null,
    });
  });

  it('supports discount rate when amount is omitted', () => {
    const result = calculateOrderMoney({
      subtotal: 200,
      discountRate: 0.1,
      shippingCost: 0,
    });

    expect(result.discountAmount).toBe(20);
    expect(result.vatAmount).toBe(38);
    expect(result.grandTotal).toBe(218);
  });

  it('prefers explicit discount amount over rate', () => {
    const result = calculateOrderMoney({
      subtotal: 200,
      discountAmount: 15,
      discountRate: 0.5,
    });

    expect(result.discountAmount).toBe(15);
    expect(result.grandTotal).toBe(223);
  });

  it('handles empty and zero inputs without mutating caller data', () => {
    const tiers = [...smallOrderTiers];
    const input = {
      subtotal: 0,
      shippingCost: 0,
      discountAmount: 0,
      smallOrderTiers: tiers,
    };

    const result = calculateOrderMoney(input);

    expect(result).toMatchObject({
      subtotal: 0,
      discountAmount: 0,
      smallOrderCharge: 4.99,
      shippingCost: 0,
      vatAmount: 0,
      grandTotal: 4.99,
      matchedSmallOrderTier: smallOrderTiers[0],
    });
    expect(tiers).toEqual(smallOrderTiers);
  });

  it('rounds component amounts to two decimal places', () => {
    const result = calculateOrderMoney({
      subtotal: 33.33,
      discountRate: 0.333,
      shippingCost: 1.005,
      vatRate: 0.19,
    });

    expect(result.discountAmount).toBe(11.1);
    expect(result.vatAmount).toBe(6.33);
    expect(result.shippingCost).toBe(1.01);
    expect(result.grandTotal).toBe(29.57);
  });
});
