import { resolveTierUnitPrice } from '~/helpers/cart-pricing';
import { mockProducts } from '~/server/utils/mockProducts';

export type CatalogMoney = Readonly<{
  minor: number;
  currency: 'RON';
}>;

export type CatalogQuoteLine = Readonly<{
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: CatalogMoney;
  lineTotal: CatalogMoney;
}>;

export type CatalogQuote = Readonly<{
  currency: 'RON';
  quotedAt: Date;
  lines: readonly CatalogQuoteLine[];
  merchandiseTotal: CatalogMoney;
}>;

export type QuoteItemsResult =
  | { kind: 'quoted'; quote: CatalogQuote }
  | { kind: 'unavailable'; productId: string };

const quoteItems = async (input: {
  items: readonly { productId: string; quantity: number }[];
}): Promise<QuoteItemsResult> => {
  const lines: CatalogQuoteLine[] = [];

  for (const requested of input.items) {
    const product = mockProducts.find((candidate) => candidate._id === requested.productId || candidate.code === requested.productId);

    if (!product?.active) {
      return { kind: 'unavailable', productId: requested.productId };
    }

    const quantity = Math.max(0, Number(requested.quantity || 0));
    const unitPriceMinor = Math.round(resolveTierUnitPrice(product, quantity) * 100);

    lines.push({
      productId: product._id,
      sku: product.code,
      name: product.name,
      quantity,
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
    },
  };
};

export const catalog = {
  quoteItems,
};
