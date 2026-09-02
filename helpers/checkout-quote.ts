import type { ShippingOrderPricingResponse } from '~/types/order-summary/shipping-services';
import type { CartProductsInterface } from '~/types/cart';

export type CheckoutQuote = NonNullable<ShippingOrderPricingResponse['quote']>;

export const toCheckoutMoneyView = (quote: CheckoutQuote) => ({
  currency: quote.currency,
  subtotal: quote.merchandiseTotal,
  discountAmount: quote.discountTotal,
  shippingCost: quote.shippingTotal,
  smallOrderCharge: quote.smallOrderCharge,
  vatRate: quote.vatRate,
  vatAmount: quote.vatTotal,
  total: quote.grandTotal,
});

export const toPersistedOrderLineMoneyView = (item: CartProductsInterface, legacyVatRate = 0) => ({
  listUnitPrice: item.initialUnitPrice,
  unitPrice: item.unitPriceAfterDiscounts,
  subtotal: item.subtotal,
  vatTotal: item.vatTotal ?? Number((item.subtotal * legacyVatRate).toFixed(2)),
});
