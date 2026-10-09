<template>
  <div v-if="isClientReady && cartStore.mappedCartItems.length" class="flex flex-col gap-6 mb-6">
    <OrderSummaryTableHead @check-all="checkAll" @delete-selected="deleteSelected" />
    <div v-if="stockItems && stockItems.length">
      <span class="text-neutral-700 text-base font-semibold leading-6">Stock Items: {{ stockItems.length }}</span>
    </div>
    <SkeletonLoader v-if="loading" />
    <OrderSummaryTableItem
      v-for="item in stockItems"
      :key="`stock-${item.id}`"
      :item="item"
      :quote-line="quote?.lines.find((line) => line.productId === item.id)"
      :stock-item="true"
      @update-quantity="updateSubtotal"
    />
    <div v-if="backOrderItems && backOrderItems.length">
      <span class="text-neutral-700 text-base font-semibold leading-6">Backorder Items: {{ backOrderItems.length }}</span>
    </div>
    <SkeletonLoader v-if="loading" />
    <OrderSummaryTableItem
      v-for="item in backOrderItems"
      :key="`back-${item.id}`"
      :item="item"
      :quote-line="quote?.lines.find((line) => line.productId === item.id)"
      :stock-item="false"
      @update-quantity="updateSubtotal"
    />
  </div>
</template>

<script setup lang="ts">
import type { CartProductsInterface } from '~~/types/cart';
import type { ShippingOrderPricingResponse } from '~~/types/order-summary/shipping-services';
import { useCartStore } from '~/store/cartStore';
import { useClientReady } from '~/composables/useClientReady';

defineProps<{
  loading: boolean;
  quote?: ShippingOrderPricingResponse['quote'];
}>();

const emits = defineEmits(['checkAll', 'updateSubtotal', 'deleteSelected']);

const cartStore = useCartStore();
const isClientReady = useClientReady();
onMounted(() => {
  if (cartStore.cart) {
    cartStore.cart.products = mapCartItems(cartStore.cart?.products);
  }
});

const stockItems = computed(() => {
  return cartStore.cart?.products?.filter((item: CartProductsInterface) => item.productEntity?.stock !== undefined && item.stock > 0) ?? [];
});

const backOrderItems = computed(() => {
  return (
    cartStore.cart?.products?.filter((item: CartProductsInterface) => {
      return item.productEntity?.stock !== undefined && item?.backorder_stock && item?.backorder_stock > 0;
    }) ?? []
  );
});

function checkAll(checked: boolean): void {
  emits('checkAll', checked);
}

function updateSubtotal(): void {
  emits('updateSubtotal', cartStore.cart?.products);
}

function deleteSelected(): void {
  emits('deleteSelected', true);
}
</script>
