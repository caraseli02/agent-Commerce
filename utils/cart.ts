import type { CartInterface, CartProductsInterface } from '~/types/cart';

const defaultDiscount = {
  value: 0,
  startDate: '',
  endDate: '',
};

export const applyOptimisticCartAdd = (
  currentCart: CartInterface | null | undefined,
  productsToAdd: Partial<CartProductsInterface>[],
): CartInterface => {
  const products = [...(currentCart?.products ?? [])];

  for (const incoming of productsToAdd) {
    const stockDelta = Number(incoming.stock ?? 0);
    if (stockDelta === 0) {
      continue;
    }

    const index = products.findIndex((item) => item.id === incoming.id);
    if (index >= 0) {
      const existingProduct = products[index];
      if (!existingProduct) continue;
      const nextStock = Number(existingProduct.stock ?? 0) + stockDelta;
      if (nextStock <= 0) {
        products.splice(index, 1);
      } else {
        products[index] = { ...existingProduct, stock: nextStock };
      }
      continue;
    }

    if (stockDelta > 0) {
      const unitPrice = Number(incoming.unitPriceAfterDiscounts ?? incoming.initialUnitPrice ?? 0);
      const lineTotal = unitPrice * stockDelta;
      products.push({
        id: incoming.id ?? '',
        stock: stockDelta,
        backorder_stock: 0,
        isFolder: incoming.isFolder ?? false,
        initialUnitPrice: incoming.initialUnitPrice ?? unitPrice,
        unitPriceAfterDiscounts: unitPrice,
        total: incoming.total ?? lineTotal,
        subtotal: incoming.subtotal ?? lineTotal,
        discount: incoming.discount ?? defaultDiscount,
        productEntity: incoming.productEntity,
      } as CartProductsInterface);
    }
  }

  return {
    _id: currentCart?._id || 'optimistic-cart',
    userId: currentCart?.userId ?? '',
    products,
    startDate: currentCart?.startDate ?? new Date().toISOString(),
    endDate: currentCart?.endDate ?? new Date().toISOString(),
  };
};

export const mapCartItems = (cartProducts: CartProductsInterface[] = []) => {
  return cartProducts.map((product) => ({
    id: product.id,
    stock: product.stock,
    backorder_stock: product.backorder_stock || 0,
    isFolder: false,
    initialUnitPrice: product.initialUnitPrice,
    unitPriceAfterDiscounts: product.unitPriceAfterDiscounts,
    subtotal: product.subtotal || 0,
    total: product.total || 0,
    discount: product.discount || {
      value: 0,
      startDate: '',
      endDate: '',
    },
    productEntity: product.productEntity,
    liked: false,
    selected: false,
  }));
};

export const calculateCartSubtotal = (cartProducts: CartProductsInterface[] = []) => {
  const subtotal = cartProducts.reduce((total, item) => {
    const stockTotal = Number(item.unitPriceAfterDiscounts) * Number(item.stock || 0);
    const backorderTotal = Number(item.unitPriceAfterDiscounts) * Number(item.backorder_stock || 0);
    return total + stockTotal + backorderTotal;
  }, 0);

  return Number(subtotal.toFixed(2));
};

export const calculateCartDiscount = (cartProducts: CartProductsInterface[] = []) => {
  const discount = cartProducts.reduce((total, item) => {
    const initialTotal = Number(item.initialUnitPrice) * Number(item.stock || 0);
    const discountedTotal = Number(item.unitPriceAfterDiscounts) * Number(item.stock || 0);
    return total + initialTotal - discountedTotal;
  }, 0);

  return Number(discount.toFixed(2));
};
