<template>
  <div class="rounded-lg" :class="expanded ? 'custom-shadow' : ''">
    <OrderSummaryTableItemHeader
      :short-stock="shortStock"
      :stock-item="stockItem"
      :expanded="expanded"
      :item="item"
      :item-quantity="itemQuantity"
      @toggle-expanded="expanded = $event"
      @check="emits('check', $event)"
      @delete-item="deleteItem = $event"
    />
    <Transition name="expand">
      <OrderSummaryTableItemDropdown
        v-if="expanded"
        :key="stockItem ? `${item.id} - ${item.stock}` : `${item.id} - ${item.backorder_stock}`"
        ref="tab"
        :item="item"
        :quote-line="quoteLine"
        :short-stock="shortStock as boolean"
        :stock-item="stockItem"
        class="item"
        @update-quantity="emits('updateQuantity')"
      />
    </Transition>
  </div>
  <CartDeleteDialog v-model="deleteItem" :product-ids="[item.id]" @close="deleteItem = false" />
</template>

<script setup lang="ts">
import CartDeleteDialog from '~/components/cart/CartDeleteDialog.vue';
import type { CartProductsInterface } from '~/types/cart';
import type { OrderSummaryQuoteLine } from '~/helpers/order-summary-line-money';

const props = defineProps<{
  item: CartProductsInterface;
  quoteLine?: OrderSummaryQuoteLine;
  stockItem: boolean;
}>();

const emits = defineEmits(['updateQuantity', 'check', 'deleteCurrent']);

const expanded = ref(false);
const thresholdStock = 10;
const deleteItem = ref(false);

const itemQuantity = computed(() => {
  return props.stockItem ? Number(props.item.backorder_stock) : Number(props.item.stock);
});

// eslint-disable-next-line vue/return-in-computed-property
const shortStock = computed(() => {
  if (props.item.productEntity?.stock)
    return Number(props.item.productEntity?.stock) <= thresholdStock && props.item.productEntity?.stock > 0 && props.stockItem;
});

watch(itemQuantity, () => {
  if (props.item.stock || props.item.backorder_stock) {
    emits('updateQuantity');
  }
});

const setupMediaQuery = () => {
  const mediaQuery = window.matchMedia('(min-width: 1280px)');
  const handler = (e: MediaQueryListEvent) => {
    expanded.value = e.matches;
  };
  mediaQuery.addEventListener('change', handler);
  handler({ matches: mediaQuery.matches } as MediaQueryListEvent);
};

onMounted(setupMediaQuery);
</script>

<style scoped>
.expand-enter-from,
.expand-leave-to {
  opacity: 0.5;
  max-height: 0;
  overflow: hidden;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}

.expand-enter-active,
.expand-leave-active {
  transition:
    max-height 0.5s cubic-bezier(0, 0.3, 0.6, 1),
    opacity 0.5s ease;
}

.item {
  transform-origin: top;
}

.header-transition {
  transition-property: box-shadow, border-radius, opacity;
  transition-timing-function: cubic-bezier(0, 0.3, 0.6, 1);
  transition-duration: 150ms;
}

.custom-shadow {
  box-shadow: 0px 3px 8px 0px rgba(133, 133, 133, 0.25);
}
</style>
