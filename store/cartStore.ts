import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import Emitter from 'tiny-emitter/instance.js';
import { fetchCartList } from '~/composables/api/cart';
import type { CartInterface } from '~/types/cart';
import { calculateCartSubtotal, mapCartItems } from '~/utils/cart';

type CheckoutError = {
  message?: string;
  type?: string;
  code?: string;
};

export const useCartStore = defineStore(
  'cart-store',
  () => {
    const cart = ref<CartInterface | null>(null);
    const hasFetchedCart = ref(false);
    const orderClientSecret = ref<string | null>(null);
    const previousCheckoutError = ref<CheckoutError | null>(null);

    const setCart = (nextCart: CartInterface) => {
      cart.value = nextCart;
      hasFetchedCart.value = true;
      Emitter.emit('update-cart', nextCart);
    };

    const setOrderClientSecret = (secret: string) => {
      orderClientSecret.value = secret;
    };

    const setPreviousCheckoutError = (error: CheckoutError) => {
      previousCheckoutError.value = error;
    };

    const emptyOrderClientSecret = () => {
      orderClientSecret.value = null;
    };

    const emptyPreviousCheckoutError = () => {
      previousCheckoutError.value = null;
    };

    const updateAndReturnCart = async () => {
      const cartResponse = await fetchCartList();
      hasFetchedCart.value = true;

      if (!cartResponse) {
        return null;
      }

      cart.value = cartResponse.data;
      Emitter.emit('update-cart', cart.value);

      return cart.value as CartInterface;
    };

    const emptyCart = () => {
      cart.value = null;
      hasFetchedCart.value = false;
      orderClientSecret.value = null;
    };

    const mappedCartItems = computed(() => mapCartItems(cart.value?.products));
    const getCart = computed(() => cart.value as CartInterface | null);
    const getCartSubtotal = computed(() => calculateCartSubtotal(cart.value?.products));
    const getOrderClientSecret = computed(() => orderClientSecret.value as string);
    const getPreviousCheckoutError = computed(() => previousCheckoutError.value as CheckoutError);
    const itemsDiscount = computed(() => cart.value?.products?.[0]?.discount.value);

    return {
      cart,
      hasFetchedCart,
      orderClientSecret,
      previousCheckoutError,
      setCart,
      setOrderClientSecret,
      setPreviousCheckoutError,
      emptyOrderClientSecret,
      emptyPreviousCheckoutError,
      updateAndReturnCart,
      emptyCart,
      mappedCartItems,
      getCart,
      getCartSubtotal,
      getOrderClientSecret,
      getPreviousCheckoutError,
      itemsDiscount,
    };
  },
  {
    persist: {
      storage: piniaPluginPersistedstate.localStorage(),
      // Session-scoped fetch flag must not revive as "ready" before a network refresh.
      pick: ['cart', 'orderClientSecret', 'previousCheckoutError'],
    },
  }
);
