import { defineStore } from 'pinia';
import Emitter from 'tiny-emitter/instance.js';
import { fetchCartList } from '~/composables/api/cart';
import type { CartInterface, CartProductsInterface } from '~/model/cart/response/cart.interface';
import { calculateCartSubtotal, mapCartItems } from '~/utils/cart';

type CheckoutError = {
  message?: string;
  type?: string;
  code?: string;
};

export const useCartStore = defineStore({
  id: 'cart-store',
  state: () => {
    return {
      cart: null as CartInterface | null,
      orderClientSecret: null as string | null,
      previousCheckoutError: null as CheckoutError | null,
      cartSubtotal: 0,
    };
  },
  actions: {
    setCart(cart: CartInterface) {
      this.cart = cart;
      Emitter.emit('update-cart', cart);
    },
    setOrderClientSecret(secret: string) {
      this.orderClientSecret = secret;
    },
    setPreviousCheckoutError(error: CheckoutError) {
      this.previousCheckoutError = error;
    },
    emptyOrderClientSecret() {
      this.orderClientSecret = null;
    },
    emptyPreviousCheckoutError() {
      this.previousCheckoutError = null;
    },
    async updateAndReturnCart() {
      const cartResponse = await fetchCartList();

      if (!cartResponse) {
        return null;
      }

      this.cart = cartResponse.data;

      Emitter.emit('update-cart', this.cart);

      return this.cart as CartInterface;
    },
    emptyCart() {
      this.cart = null;
      this.orderClientSecret = null;
    },
    makeCartItemFavorite(itemId: string) {
      const item = this.cart?.products?.find((product: CartProductsInterface) => product.id === itemId);
      if (item?.liked) {
        item.liked = false;
      } else if (item && !item?.liked) {
        item.liked = true;
      }
    },
  },
  getters: {
    mappedCartItems: (state) => {
      return mapCartItems(state.cart?.products);
    },
    getCart: (state) => state.cart as CartInterface | null,
    getCartSubtotal: (state) => calculateCartSubtotal(state.cart?.products),
    getOrderClientSecret: (state): string => state.orderClientSecret as string,
    getPreviousCheckoutError: (state): CheckoutError => state.previousCheckoutError as CheckoutError,
    itemsDiscount: (state) => state.cart?.products?.[0]?.discount.value,
  },
  persist: {
    storage: piniaPluginPersistedstate.localStorage(),
  },
});
