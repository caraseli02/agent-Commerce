type ProductPriceTier = {
  configuration?: Array<{ price?: number; quantity?: number }>;
};

type ProductPriceHistoryEntry = {
  active?: boolean;
  price?: number;
};

/** Structural product shape used by cart pricing helpers (client + mock server). */
export type ProductWithPricing =
  | {
      stock?: number;
      adminSettings?: { discount?: { value?: number } };
      priceConfiguration?: ProductPriceTier;
      priceHistory?: ProductPriceHistoryEntry[];
    }
  | null
  | undefined;

export const resolveTierUnitPrice = (product: ProductWithPricing, quantity = 0) => {
  const configurations = product?.priceConfiguration?.configuration;

  if (configurations?.length) {
    let unitPrice = configurations[0]?.price;

    for (let i = configurations.length - 1; i >= 0; i--) {
      const tier = configurations[i];
      if (quantity >= Number(tier?.quantity ?? 0)) {
        unitPrice = tier?.price;
        break;
      }
    }

    return Number(unitPrice) || 0;
  }

  const activePrice = product?.priceHistory?.find((entry) => entry?.active)?.price ?? product?.priceHistory?.[0]?.price ?? 0;

  return Number(activePrice) || 0;
};

export const resolveAppliedDiscountPercent = (product: ProductWithPricing, customerDiscountPercent = 0) => {
  const productDiscount = Math.max(0, Number(product?.adminSettings?.discount?.value || 0));
  const customerDiscount = Math.max(0, Number(customerDiscountPercent || 0));

  return productDiscount || customerDiscount;
};

export const resolveCustomerUnitPrice = (product: ProductWithPricing, customerDiscountPercent = 0, quantity = 0) => {
  const tierPrice = resolveTierUnitPrice(product, quantity);
  const appliedDiscount = resolveAppliedDiscountPercent(product, customerDiscountPercent);

  return Number((tierPrice * (1 - appliedDiscount / 100)).toFixed(2));
};

export type ClampCartQuantityOptions = {
  existingBackorderStock?: number;
};

export type ClampCartQuantityResult = {
  stock: number;
  wasClamped: boolean;
  maxStock: number;
};

export const clampCartQuantity = (
  product: ProductWithPricing,
  requestedStock: number,
  options: ClampCartQuantityOptions = {},
): ClampCartQuantityResult => {
  const requested = Math.max(0, Number(requestedStock) || 0);

  if (product?.stock === undefined) {
    return {
      stock: requested,
      wasClamped: false,
      maxStock: 0,
    };
  }

  const maxStock = Math.max(0, Number(product.stock));
  const existingBackorder = Math.max(0, Number(options.existingBackorderStock ?? 0));
  const maxAllowedStock = existingBackorder > 0 ? maxStock : maxStock;
  const stock = Math.min(requested, maxAllowedStock);

  return {
    stock,
    wasClamped: stock !== requested,
    maxStock,
  };
};

export const calculateCartLinePricing = (product: ProductWithPricing, stock = 0, backorderStock = 0) => {
  const quantity = Number(stock) + Number(backorderStock);
  const initialUnitPrice = resolveTierUnitPrice(product, quantity);
  const unitPriceAfterDiscounts = initialUnitPrice;
  const subtotal = unitPriceAfterDiscounts * quantity;

  return {
    initialUnitPrice,
    unitPriceAfterDiscounts,
    subtotal: Number(subtotal.toFixed(2)),
    total: Number(subtotal.toFixed(2)),
  };
};
