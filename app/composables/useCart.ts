// ~/composables/useCart.ts
import { computed, ref } from 'vue';
import { useRouter, useRuntimeConfig } from '#app';
import { useUiStore } from '~/store/uiStore';
import { addEntityToCart, removeEntityFromCart, updateEntityFromCart } from '~/composables/api/cart';
import { getShippingPricesForOrder } from '~/composables/api/orders';
import { clampCartQuantity } from '~~/helpers/cart-pricing';
import type {
  AddToCartRequestInterface,
  CartInterface,
  CartProductsInterface,
  DeleteProductCartRequestInterface,
  UpdateProductCartRequestInterface,
} from '~~/types/cart';
import { useCartStore } from '~/store/cartStore';
import type { ShippingOrderPricingResponse } from '~~/types/order-summary/shipping-services';
import { loadCartRead } from '~/composables/loadCartRead';
import { applyOptimisticCartAdd, calculateCartDiscount, calculateCartSubtotal, mapCartItems } from '~/utils/cart';
import { canSkipAuthenticatedUser } from '~~/helpers/mock-integration';

export type AddToCartResult = {
  status: 'success';
  changed: boolean;
} | null;

export const __resetAddToCartStateForTests = () => {
  const cartStore = useCartStore();
  cartStore.clearAddToCartInFlight();
};

export function useCart() {
  const router = useRouter();

  const cartStore = useCartStore();
  const cartItems = ref([] as CartProductsInterface[]);
  const cartId = ref('' as string);

  const syncLocalCartRefs = (cart: CartInterface | null) => {
    cartId.value = cart?._id || '';
    cartItems.value = mapCartItems(cart?.products || []);
  };

  const showAddToCartError = async (description = 'Please try again.') => {
    const { toast } = await import('~/components/ui/toast');
    toast({
      title: 'Could not update cart',
      description,
      variant: 'destructive',
    });
  };

  const promptForAuthenticationIfNeeded = async () => {
    const config = useRuntimeConfig();
    const token = useCookie('token').value;

    if (canSkipAuthenticatedUser(Boolean(config.public.MOCK_MODE), Boolean(token))) {
      return false;
    }

    await router.push('/');
    useUiStore().requestOpenAccountModal();
    return true;
  };

  const clampCartProducts = async (
    products: Partial<CartProductsInterface>[] = [],
    mode: 'add' | 'set',
  ): Promise<CartProductsInterface[]> => {
    let wasClamped = false;
    let clampMessage = '';

    const clampedProducts = products.map((product) => {
      const existing = cartStore.cart?.products?.find((item) => item.id === product.id);
      const productEntity = product.productEntity ?? existing?.productEntity;

      if (!productEntity || product.stock === undefined) {
        return product as CartProductsInterface;
      }

      const previousStock = Number(existing?.stock ?? 0);
      const incomingStock = Number(product.stock ?? 0);
      const targetStock = mode === 'add' ? previousStock + incomingStock : incomingStock;
      const clampResult = clampCartQuantity(productEntity, targetStock, {
        existingBackorderStock: existing?.backorder_stock,
      });

      if (clampResult.wasClamped) {
        wasClamped = true;
        clampMessage = `Only ${clampResult.maxStock} items are available. Quantity was adjusted.`;
      }

      // Keep negative deltas so quantity reductions are not coerced to no-ops.
      const adjustedStock = mode === 'add' ? clampResult.stock - previousStock : clampResult.stock;

      return {
        ...product,
        stock: adjustedStock,
        productEntity,
      } as CartProductsInterface;
    });

    if (wasClamped) {
      const { toast } = await import('~/components/ui/toast');
      toast({
        title: 'Limited stock',
        description: clampMessage,
        variant: 'default',
      });
    }

    return clampedProducts;
  };

  const refreshCart = async () => {
    const cart = await loadCartRead(() => cartStore.updateAndReturnCart());
    const products = cart?.products || [];
    cartId.value = cart?._id || '';
    cartItems.value = mapCartItems(products);
    return cart;
  };

  const fetchList = async () => {
    await refreshCart();
  };

  const addToCart = async (payload: AddToCartRequestInterface): Promise<AddToCartResult> => {
    if (await promptForAuthenticationIfNeeded()) {
      return null;
    }

    const productIds = (payload.products ?? []).map((product) => String(product.id ?? '')).filter(Boolean);
    if (productIds.some((id) => cartStore.isProductAddInFlight(id))) {
      // Surfaces already disable busy products — stay silent to avoid false failure toasts.
      return null;
    }

    const clampedProducts = await clampCartProducts(payload.products, 'add');
    if (clampedProducts.every((product) => Number(product.stock ?? 0) === 0)) {
      return { status: 'success', changed: false };
    }

    cartStore.beginAddToCart(productIds);

    let previousCart: CartInterface | null = null;
    let appliedOptimistic = false;

    try {
      previousCart = cartStore.cart ? (JSON.parse(JSON.stringify(cartStore.cart)) as CartInterface) : null;
      const optimisticCart = applyOptimisticCartAdd(previousCart, clampedProducts);

      cartStore.setOptimisticCart(optimisticCart);
      syncLocalCartRefs(optimisticCart);
      appliedOptimistic = true;

      const response = await addEntityToCart({
        ...payload,
        products: clampedProducts,
      });

      if (response?.status !== 'success') {
        throw new Error('mutation-failed');
      }
    } catch (error) {
      if (appliedOptimistic) {
        cartStore.restoreCartSnapshot(previousCart);
        syncLocalCartRefs(previousCart);
      }
      if (import.meta.dev) {
        console.error('[useCart] addToCart failed', error);
      }
      await showAddToCartError('Please try again.');
      return null;
    } finally {
      cartStore.endAddToCart(productIds);
    }

    // Refresh is outside the rollback boundary — a flaky GET must not undo a successful POST.
    try {
      await refreshCart();
    } catch (error) {
      if (import.meta.dev) {
        console.error('[useCart] refreshCart after add failed', error);
      }
    }

    return { status: 'success', changed: true };
  };

  const updateCartItem = async (payload: UpdateProductCartRequestInterface) => {
    if (await promptForAuthenticationIfNeeded()) {
      return null;
    }

    const response = await updateEntityFromCart({
      ...payload,
      products: await clampCartProducts(payload.products, 'set'),
    });
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
      (item: CartProductsInterface) => item.productEntity?.stock !== undefined && (item.backorder_stock ?? 0) > 0,
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
    isAddingToCart: computed(() => cartStore.isAddingToCart),
    isProductAddInFlight: cartStore.isProductAddInFlight,
  };
}
