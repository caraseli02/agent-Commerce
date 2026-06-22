import type { CartProductsInterface } from '~/model/cart/response/cart.interface';

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
