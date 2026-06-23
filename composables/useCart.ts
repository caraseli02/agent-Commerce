// ~/composables/useCart.ts
import { computed, ref } from 'vue';
import Emitter from 'tiny-emitter/instance.js';
import { useRouter, useRuntimeConfig } from '#app';
import { addEntityToCart, removeEntityFromCart, updateEntityFromCart } from '~/composables/api/cart';
import { getShippingPricesForOrder } from '~/composables/api/orders';
import type {
  AddToCartRequestInterface,
  DeleteProductCartRequestInterface,
  UpdateProductCartRequestInterface,
} from '~/model/cart/request/cart.interface';
import type { CartInterface, CartProductsInterface } from '~/model/cart/response/cart.interface';
import { useCartStore } from '~/store/cartStore';
import type { ShippingOrderPricingResponse } from '~/types/order-summary/shipping-services';
import { calculateCartDiscount, calculateCartSubtotal, mapCartItems } from '~/utils/cart';

export function useCart() {
  const router = useRouter();

  const cartStore = useCartStore();
  const cartItems = ref([] as CartProductsInterface[]);
  const cartId = ref('' as string);

  const promptForAuthenticationIfNeeded = async () => {
    const config = useRuntimeConfig();
    const token = useCookie('token').value;

    if (token || config.public.MOCK_MODE) {
      return false;
    }

    await router.push('/');
    Emitter.emit('open-account-modal');
    return true;
  };

  const refreshCart = async () => {
    const cart = (await cartStore.updateAndReturnCart()) as CartInterface | null;
    const products = cart?.products || [];
    cartId.value = cart?._id || '';
    cartItems.value = mapCartItems(products);
    return cart;
  };

  const fetchList = async () => {
    await refreshCart();
  };

  const addToCart = async (payload: AddToCartRequestInterface) => {
    if (await promptForAuthenticationIfNeeded()) {
      return null;
    }

    const response = await addEntityToCart(payload);
    await refreshCart();
    return response;
  };

  const updateCartItem = async (payload: UpdateProductCartRequestInterface) => {
    if (await promptForAuthenticationIfNeeded()) {
      return null;
    }

    const response = await updateEntityFromCart(payload);
    await refreshCart();
    return response;
  };

  const removeFromCart = async (payload: DeleteProductCartRequestInterface) => {
    if (await promptForAuthenticationIfNeeded()) {
      return null;
    }

    const response = await removeEntityFromCart(payload);
    await refreshCart();
    return response;
  };

  const fetchShippingPrices = async (order: unknown) => {
    const response = (await getShippingPricesForOrder(order)) as {
      status: string;
      description: string;
      data: ShippingOrderPricingResponse;
    };
    if (response.status === 'failed') {
      return null;
    }

    return response.data;
  };

  const calculateSubtotal = async (orderItems: CartProductsInterface[], order: { subtotal: number }) => {
    if (!orderItems) {
      return;
    }

    order.subtotal = calculateCartSubtotal(orderItems);
  };

  const calculateDiscount = (orderItems: CartProductsInterface[], order: Ref<{ discount: { total: number } }>) => {
    if (!orderItems) {
      return;
    }

    order.value.discount.total = calculateCartDiscount(orderItems);
  };

  const showWarning = computed(() => {
    return cartItems.value.some(
      (item: CartProductsInterface) => item.productEntity?.stock !== undefined && item.productEntity.stock < item.stock
    );
  });

  return {
    cartItems,
    fetchList,
    refreshCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    calculateSubtotal,
    calculateDiscount,
    cartId,
    showWarning,
    fetchShippingPrices,
  };
}
