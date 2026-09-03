import { resolveAppliedDiscountPercent, resolveCustomerUnitPrice, resolveTierUnitPrice } from '~/helpers/cart-pricing';
import { mockProducts } from '~/server/utils/mockProducts';
import type { UserInterface } from '~/types/auth/user-interface';
import type { ShippingOrderPricingOption } from '~/types/order-summary/shipping-services';
import { DEFAULT_ORDER_VAT_RATE, resolveSmallOrderCharge, type SmallOrderChargeTier } from '~/helpers/order-money';

export type CatalogMoney = Readonly<{
  minor: number;
  currency: 'RON';
}>;

export type CatalogQuoteLine = Readonly<{
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  listUnitPrice: CatalogMoney;
  discountPercent: number;
  discountTotal: CatalogMoney;
  unitPrice: CatalogMoney;
  lineTotal: CatalogMoney;
}>;

export type CatalogQuote = Readonly<{
  currency: 'RON';
  quotedAt: Date;
  lines: readonly CatalogQuoteLine[];
  merchandiseTotal: CatalogMoney;
  discountTotal: CatalogMoney;
  smallOrderCharge: CatalogMoney;
  smallOrderTier: SmallOrderChargeTier | null;
}>;

export type QuoteItemsResult = { kind: 'quoted'; quote: CatalogQuote } | { kind: 'unavailable'; productId: string };

export type CatalogCheckoutQuote = Omit<CatalogQuote, 'lines'> &
  Readonly<{
    lines: readonly (CatalogQuoteLine & { vatTotal: CatalogMoney })[];
    deliveryOption: ShippingOrderPricingOption;
    shippingTotal: CatalogMoney;
    vatRate: number;
    vatTotal: CatalogMoney;
    grandTotal: CatalogMoney;
  }>;

export type QuoteCheckoutResult =
  { kind: 'quoted'; quote: CatalogCheckoutQuote } | { kind: 'unavailable'; productId: string } | { kind: 'delivery-unavailable' };

const deliveryOptions: readonly ShippingOrderPricingOption[] = [
  { service: { id: 1, courierName: 'Demo Express', name: 'Standard Delivery' }, price: { total: 19.9, noVat: 16.72 } },
  { service: { id: 2, courierName: 'Fast Lane', name: 'Next Day' }, price: { total: 29.9, noVat: 25.13 } },
];

const smallOrderTiers: readonly SmallOrderChargeTier[] = [{ _id: 'soc-001', min: 0, max: 50, price: 4.99 }];

const quoteItems = async (input: {
  customer?: UserInterface;
  items: readonly { productId: string; quantity: number }[];
}): Promise<QuoteItemsResult> => {
  const lines: CatalogQuoteLine[] = [];

  for (const requested of input.items) {
    const product = mockProducts.find((candidate) => candidate._id === requested.productId || candidate.code === requested.productId);

    if (!product?.active) {
      return { kind: 'unavailable', productId: requested.productId };
    }

    const quantity = Math.max(0, Number(requested.quantity || 0));
    const customerDiscount = Number(input.customer?.adminSettings?.discount?.value || 0);
    const listUnitPriceMinor = Math.round(resolveTierUnitPrice(product, quantity) * 100);
    const discountPercent = resolveAppliedDiscountPercent(product, customerDiscount);
    const unitPriceMinor = Math.round(resolveCustomerUnitPrice(product, customerDiscount, quantity) * 100);
    const discountTotalMinor = (listUnitPriceMinor - unitPriceMinor) * quantity;

    lines.push({
      productId: product._id,
      sku: product.code,
      name: product.name,
      quantity,
      listUnitPrice: { minor: listUnitPriceMinor, currency: 'RON' },
      discountPercent,
      discountTotal: { minor: discountTotalMinor, currency: 'RON' },
      unitPrice: {
        minor: unitPriceMinor,
        currency: 'RON',
      },
      lineTotal: {
        minor: unitPriceMinor * quantity,
        currency: 'RON',
      },
    });
  }

  const totalMinor = lines.reduce((sum, line) => sum + line.lineTotal.minor, 0);
  const discountTotalMinor = lines.reduce((sum, line) => sum + line.discountTotal.minor, 0);
  const smallOrder = resolveSmallOrderCharge(totalMinor / 100, [...smallOrderTiers]);

  return {
    kind: 'quoted',
    quote: {
      currency: 'RON',
      quotedAt: new Date(),
      lines,
      merchandiseTotal: {
        minor: totalMinor,
        currency: 'RON',
      },
      discountTotal: {
        minor: discountTotalMinor,
        currency: 'RON',
      },
      smallOrderCharge: {
        minor: Math.round(smallOrder.charge * 100),
        currency: 'RON',
      },
      smallOrderTier: smallOrder.tier,
    },
  };
};

const quoteDelivery = async (serviceId?: string | number | null) => {
  const normalizedId = Number(serviceId || 1);
  const option = deliveryOptions.find((candidate) => candidate.service.id === normalizedId);
  return option ? { kind: 'quoted' as const, option } : { kind: 'unavailable' as const };
};

const quoteCheckout = async (input: {
  customer?: UserInterface;
  items: readonly { productId: string; quantity: number }[];
  deliveryServiceId?: string | number | null;
}): Promise<QuoteCheckoutResult> => {
  const merchandise = await quoteItems(input);
  if (merchandise.kind === 'unavailable') return merchandise;

  const delivery = await quoteDelivery(input.deliveryServiceId);
  if (delivery.kind === 'unavailable') return { kind: 'delivery-unavailable' };

  const shippingMinor = Math.round(delivery.option.price.total * 100);
  const vatMinor = Math.round(merchandise.quote.merchandiseTotal.minor * DEFAULT_ORDER_VAT_RATE);
  let allocatedVatMinor = 0;
  const lines = merchandise.quote.lines.map((line, index, allLines) => {
    const lineVatMinor =
      index === allLines.length - 1 ? vatMinor - allocatedVatMinor : Math.round(line.lineTotal.minor * DEFAULT_ORDER_VAT_RATE);
    allocatedVatMinor += lineVatMinor;
    return { ...line, vatTotal: { minor: lineVatMinor, currency: 'RON' as const } };
  });
  const grandTotalMinor = merchandise.quote.merchandiseTotal.minor + merchandise.quote.smallOrderCharge.minor + shippingMinor + vatMinor;

  return {
    kind: 'quoted',
    quote: {
      ...merchandise.quote,
      lines,
      deliveryOption: delivery.option,
      shippingTotal: { minor: shippingMinor, currency: 'RON' },
      vatRate: DEFAULT_ORDER_VAT_RATE,
      vatTotal: { minor: vatMinor, currency: 'RON' },
      grandTotal: { minor: grandTotalMinor, currency: 'RON' },
    },
  };
};

export const catalog = {
  quoteItems,
  quoteDelivery,
  quoteCheckout,
  deliveryOptions,
  smallOrderTiers,
};
