<template>
  <div class="flex min-w-[106px] items-center">
    <span :class="status?.badge.bg" class="h-4 w-4 mr-2 rounded-full text-xs text-white flex justify-center items-center">
      {{ status?.badge.text }}
    </span>
    {{ status?.label || 'Unknown Type' }}
  </div>
</template>

<script setup lang="ts">
import { getOrderTypeInfo } from '../client-table/order/options';
import type { OrderType } from '~/types/order-summary/item';

const props = defineProps<{
  type: OrderType;
}>();

const status = computed(() => {
  const orderInfo = getOrderTypeInfo(props.type);
  return orderInfo || null; // Handle potential null value
});
</script>
