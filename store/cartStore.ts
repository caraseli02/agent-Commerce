import { defineStore, storeToRefs } from 'pinia';
import Emitter from 'tiny-emitter/instance.js';
import { useNuxtApp } from '#app';
import { parseProductPriceConfiguration } from '~/helpers/prices.helper';
import { useAuthStore } from '~/store/authStore';
import type { CartInterface, CartProductsInterface } from '~/model/cart/response/cart.interface';

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
      const { $api } = useNuxtApp();
      const cartResponse = await $api.cart.fetchCartList();

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
    getCart: async (state) => {
      const { $api } = useNuxtApp();

      if (!state.cart) {
        const cartResponse = await $api.cart.fetchCartList();

        if (!cartResponse) {
          return null;
        }

        return cartResponse.data;
      }

      return state.cart as CartInterface;
    },
    getCartSubtotal: async (state) => {
      state.cartSubtotal = 0;
      const authStore = useAuthStore();
      const { getUserDetails } = storeToRefs(authStore);
      state?.cart?.products?.forEach((cartProduct: CartProductsInterface) => {
        if (!cartProduct.productEntity) {
          return;
        }

        const discountsHelper = parseProductPriceConfiguration(cartProduct.productEntity, getUserDetails.value, cartProduct.stock);

        const discountPrice = discountsHelper?.currentConfigurationDiscountPrice || 0;
        const stockTotal = Number(discountPrice) * Number(cartProduct.stock);
        const backorderTotal = Number(discountPrice) * Number(cartProduct.backorder_stock);
        const allItemsTotal = stockTotal + backorderTotal;
        state.cartSubtotal += allItemsTotal;
      });

      return Number(state.cartSubtotal.toFixed(2));
    },
    getOrderClientSecret: (state): string => state.orderClientSecret as string,
    getPreviousCheckoutError: (state): CheckoutError => state.previousCheckoutError as CheckoutError,
    itemsDiscount: (state) => state.cart?.products?.[0]?.discount.value,
  },
  persist: {
    storage: piniaPluginPersistedstate.localStorage(),
  },
});
