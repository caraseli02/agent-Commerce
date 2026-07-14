import type { CartProductsInterface } from '~/types/cart';

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
