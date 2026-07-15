import type { CartProductsInterface } from '~/types/cart/response';

export interface AddToCartRequestInterface {
  products: CartProductsInterface[];
  userId: string;
}

export interface UpdateProductCartRequestInterface {
  products: CartProductsInterface[];
  userId: string;
}

export interface DeleteProductCartRequestInterface {
  products: string[];
}
