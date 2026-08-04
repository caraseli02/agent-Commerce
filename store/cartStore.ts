import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchCartList } from '~/composables/api/cart';
import type { CartInterface } from '~/types/cart';
import { calculateCartSubtotal, mapCartItems } from '~/utils/cart';

type CheckoutError = {
  message?: string;
  type?: string;
  code?: string;
};

type PersistStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

let skipPersistOnce = false;

const createPersistStorage = (): PersistStorage => {
  const base = piniaPluginPersistedstate.localStorage() as PersistStorage;
  return {
    getItem: (key) => base.getItem(key),
    setItem: (key, value) => {
      if (skipPersistOnce) {
        skipPersistOnce = false;
        return;
      }
      base.setItem(key, value);
    },
  };
};

export const useCartStore = defineStore(
  'cart-store',
  () => {
    const cart = ref<CartInterface | null>(null);
    const hasFetchedCart = ref(false);
    const orderClientSecret = ref<string | null>(null);
    const previousCheckoutError = ref<CheckoutError | null>(null);
    /** Product ids with an in-flight add — not persisted (SSR-safe store field). */
    const addToCartInFlightIds = ref<string[]>([]);

    const setCart = (nextCart: CartInterface) => {
      cart.value = nextCart;
      // Do not mark fetched here — cached/persisted payloads must not look authoritative.
    };

    /** In-memory optimistic write — does not overwrite the last persisted real cart. */
    const setOptimisticCart = (nextCart: CartInterface) => {
      skipPersistOnce = true;
      cart.value = nextCart;
    };

    /** Restore a pre-mutation snapshot without clearing checkout secrets. */
    const restoreCartSnapshot = (snapshot: CartInterface | null) => {
      cart.value = snapshot;
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

    const beginAddToCart = (productIds: string[]) => {
      const next = new Set(addToCartInFlightIds.value);
      for (const id of productIds) {
        if (id) next.add(id);
      }
      addToCartInFlightIds.value = [...next];
    };

    const endAddToCart = (productIds: string[]) => {
      const remove = new Set(productIds.filter(Boolean));
      addToCartInFlightIds.value = addToCartInFlightIds.value.filter((id) => !remove.has(id));
    };

    const clearAddToCartInFlight = () => {
      addToCartInFlightIds.value = [];
    };

    const isProductAddInFlight = (productId: string) => addToCartInFlightIds.value.includes(productId);

    const isAddingToCart = computed(() => addToCartInFlightIds.value.length > 0);

    const updateAndReturnCart = async () => {
      const cartResponse = await fetchCartList();

      if (!cartResponse) {
        // Failed/unavailable refresh — keep showing skeleton, do not trust persisted totals.
        hasFetchedCart.value = false;
        return null;
      }

      cart.value = cartResponse.data;
      hasFetchedCart.value = true;

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
      addToCartInFlightIds,
      setCart,
      setOptimisticCart,
      restoreCartSnapshot,
      setOrderClientSecret,
      setPreviousCheckoutError,
      emptyOrderClientSecret,
      emptyPreviousCheckoutError,
      beginAddToCart,
      endAddToCart,
      clearAddToCartInFlight,
      isProductAddInFlight,
      isAddingToCart,
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
      storage: createPersistStorage(),
      // Session-scoped fetch flag and in-flight ids must not revive across reloads.
      pick: ['cart', 'orderClientSecret', 'previousCheckoutError'],
    },
  }
);
