export type SmallOrderChargeTier = {
  _id?: string;
  min: number;
  max: number;
  price: number;
};

export type OrderMoneyInput = {
  subtotal: number;
  discountAmount?: number;
  /** Decimal rate applied to subtotal when discountAmount is omitted (e.g. 0.1 = 10%). */
  discountRate?: number;
  shippingCost?: number;
  smallOrderTiers?: SmallOrderChargeTier[];
  /** Decimal VAT rate on merchandise subtotal. Defaults to 0.19. */
  vatRate?: number;
};

export type OrderMoneyResult = {
  subtotal: number;
  discountAmount: number;
  smallOrderCharge: number;
  shippingCost: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
  matchedSmallOrderTier: SmallOrderChargeTier | null;
};

const roundMoney = (value: number) => Number(Number(value).toFixed(2));

export const resolveSmallOrderCharge = (
  subtotal: number,
  tiers: SmallOrderChargeTier[] = []
): { charge: number; tier: SmallOrderChargeTier | null } => {
  const normalizedSubtotal = Number(subtotal) || 0;

  for (const tier of tiers) {
    if (normalizedSubtotal < tier.max && normalizedSubtotal >= tier.min) {
      return { charge: tier.price, tier };
    }
  }

  return { charge: 0, tier: null };
};

export const calculateOrderMoney = (input: OrderMoneyInput): OrderMoneyResult => {
  const subtotal = roundMoney(Number(input.subtotal) || 0);
  const vatRate = input.vatRate ?? 0.19;
  const shippingCost = roundMoney(Number(input.shippingCost) || 0);

  const explicitDiscount = input.discountAmount;
  const discountAmount =
    explicitDiscount !== undefined ? roundMoney(explicitDiscount) : roundMoney(subtotal * (Number(input.discountRate) || 0));

  const { charge: smallOrderCharge, tier: matchedSmallOrderTier } = resolveSmallOrderCharge(subtotal, input.smallOrderTiers);

  const vatAmount = roundMoney(subtotal * vatRate);
  const grandTotal = roundMoney(subtotal + vatAmount + shippingCost + smallOrderCharge - discountAmount);

  return {
    subtotal,
    discountAmount,
    smallOrderCharge,
    shippingCost,
    vatRate,
    vatAmount,
    grandTotal,
    matchedSmallOrderTier,
  };
};
