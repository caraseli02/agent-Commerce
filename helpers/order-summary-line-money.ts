import type { CartProductsInterface } from '~/types/cart';
import type { ShippingOrderPricingResponse } from '~/types/order-summary/shipping-services';
import { DEFAULT_ORDER_VAT_RATE } from '~/helpers/order-money';

export type OrderSummaryQuoteLine = NonNullable<ShippingOrderPricingResponse['quote']>['lines'][number];

export type OrderSummaryLineSegment = 'stock' | 'backorder';

export type OrderSummaryLineMoney = {
  listUnitPrice: number;
  unitPrice: number;
  discountPercent: number;
  vatTotal: number;
  subtotal: number;
};

const roundMoney = (value: number) => Number(value.toFixed(2));

const allocateSegmentMoney = (amount: number, immediateQuantity: number, totalQuantity: number, segment: OrderSummaryLineSegment) => {
  const immediateAmount = roundMoney((amount * immediateQuantity) / totalQuantity);

  return segment === 'stock' ? immediateAmount : roundMoney(amount - immediateAmount);
};

/**
 * Chooses the authoritative checkout quote for a cart row when its quantity
 * still matches the quote. Split stock/backorder rows receive complementary
 * allocations, so they cannot both display a full product-line total.
 */
export const resolveOrderSummaryLineMoney = (
  item: CartProductsInterface,
  quoteLine: OrderSummaryQuoteLine | undefined,
  segment: OrderSummaryLineSegment,
): OrderSummaryLineMoney => {
  const immediateQuantity = Number(item.stock || 0);
  const totalQuantity = immediateQuantity + Number(item.backorder_stock || 0);
  const quantityMatchesQuote = quoteLine && totalQuantity > 0 && quoteLine.quantity === totalQuantity;

  if (quantityMatchesQuote) {
    return {
      listUnitPrice: quoteLine.listUnitPrice,
      unitPrice: quoteLine.unitPrice,
      discountPercent: quoteLine.discountPercent,
      vatTotal: allocateSegmentMoney(quoteLine.vatTotal, immediateQuantity, totalQuantity, segment),
      subtotal: allocateSegmentMoney(quoteLine.lineTotal, immediateQuantity, totalQuantity, segment),
    };
  }

  if (!totalQuantity) {
    return {
      listUnitPrice: item.initialUnitPrice,
      unitPrice: item.unitPriceAfterDiscounts,
      discountPercent: Number(item.discount?.value || 0),
      vatTotal: 0,
      subtotal: 0,
    };
  }

  const vatTotal = item.vatTotal ?? roundMoney(item.subtotal * DEFAULT_ORDER_VAT_RATE);

  return {
    listUnitPrice: item.initialUnitPrice,
    unitPrice: item.unitPriceAfterDiscounts,
    discountPercent: Number(item.discount?.value || 0),
    vatTotal: allocateSegmentMoney(vatTotal, immediateQuantity, totalQuantity, segment),
    subtotal: allocateSegmentMoney(item.subtotal, immediateQuantity, totalQuantity, segment),
  };
};
