import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import Emitter from 'tiny-emitter/instance.js';
import { fetchCartList } from '~/composables/api/cart';
import type { CartInterface, CartProductsInterface } from '~/model/cart/response/cart.interface';
import { calculateCartSubtotal, mapCartItems } from '~/utils/cart';

type CheckoutError = {
  message?: string;
  type?: string;
  code?: string;
};

export const useCartStore = defineStore('cart-store', () => {
  const cart = ref<CartInterface | null>(null);
  const orderClientSecret = ref<string | null>(null);
  const previousCheckoutError = ref<CheckoutError | null>(null);

  const setCart = (nextCart: CartInterface) => {
    cart.value = nextCart;
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

    if (!cartResponse) {
      return null;
    }

    cart.value = cartResponse.data;
    Emitter.emit('update-cart', cart.value);

    return cart.value as CartInterface;
  };

  const emptyCart = () => {
    cart.value = null;
    orderClientSecret.value = null;
  };

  const makeCartItemFavorite = (itemId: string) => {
    const item = cart.value?.products?.find((product: CartProductsInterface) => product.id === itemId);
    if (item?.liked) {
      item.liked = false;
    } else if (item && !item?.liked) {
      item.liked = true;
    }
  };

  const mappedCartItems = computed(() => mapCartItems(cart.value?.products));
  const getCart = computed(() => cart.value as CartInterface | null);
  const getCartSubtotal = computed(() => calculateCartSubtotal(cart.value?.products));
  const getOrderClientSecret = computed(() => orderClientSecret.value as string);
  const getPreviousCheckoutError = computed(() => previousCheckoutError.value as CheckoutError);
  const itemsDiscount = computed(() => cart.value?.products?.[0]?.discount.value);

  return {
    cart,
    orderClientSecret,
    previousCheckoutError,
    setCart,
    setOrderClientSecret,
    setPreviousCheckoutError,
    emptyOrderClientSecret,
    emptyPreviousCheckoutError,
    updateAndReturnCart,
    emptyCart,
    makeCartItemFavorite,
    mappedCartItems,
    getCart,
    getCartSubtotal,
    getOrderClientSecret,
    getPreviousCheckoutError,
    itemsDiscount,
  };
}, { persist: { storage: piniaPluginPersistedstate.localStorage() } });
