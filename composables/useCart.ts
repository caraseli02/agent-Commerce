// ~/composables/useCart.ts
import { computed, ref } from 'vue';
import type { CartInterface, CartProductsInterface } from '~/model/cart/response/cart.interface';
import { useCartStore } from '~/store/cartStore';
import type { ShippingOrderPricingResponse } from '~/types/order-summary/shipping-services';

export function useCart() {
  const { $api } = useNuxtApp();

  const cartStore = useCartStore();
  const cartItems = ref([] as CartProductsInterface[]);
  const cartId = ref('' as string);

  const fetchList = async () => {
    const cart = (await cartStore.updateAndReturnCart()) as CartInterface;
    const products = cart?.products || [];
    cartId.value = cart?._id || '';
    cartItems.value = mapCartItems(products);
  };

  const fetchShippingPrices = async (order: unknown) => {
    const response = (await $api.orders.getShippingPricesForOrder(order)) as {
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

    let subtotal = 0;

    orderItems.forEach((item: CartProductsInterface) => {
      const stockTotal = Number(item.unitPriceAfterDiscounts) * item.stock;
      const backorderTotal = Number(item.unitPriceAfterDiscounts) * (item.backorder_stock || 0);
      const allItemsTotal = stockTotal + backorderTotal;
      subtotal += allItemsTotal;
    });

    order.subtotal = subtotal.toFixed(2) as unknown as number;
  };

  const calculateDiscount = (orderItems: CartProductsInterface[], order: Ref<{ discount: { total: number } }>) => {
    if (!orderItems) {
      return;
    }

    let discount = 0;

    orderItems.forEach((item: CartProductsInterface) => {
      discount += Number(item.initialUnitPrice) * item.stock - Number(item.unitPriceAfterDiscounts) * item.stock;
    });
    order.value.discount.total = discount;
  };

  const showWarning = computed(() => {
    return cartItems.value.some(
      (item: CartProductsInterface) => item.productEntity?.stock !== undefined && item.productEntity.stock < item.stock
    );
  });

  return { cartItems, fetchList, calculateSubtotal, calculateDiscount, cartId, showWarning, fetchShippingPrices };
}
