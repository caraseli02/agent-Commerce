<template>
  <div class="absolute top-0 left-0 px-2 py-1 gap-2 flex items-center rounded-tl-xl rounded-br-lg" :class="colorClass">
    <WarningIcon v-if="outOfStock" class="w-4 h-4 !text-white" />
    <CheckIcon v-else class="w-4 h-4 text-white" />
    <span class="text-[11px] leading-tight font-semibold text-white">
      {{ outOfStock ? `${stock} in stock backorder only` : `${stock} in stock` }}
    </span>
  </div>
</template>

<script setup lang="ts">
import WarningIcon from '@/assets/icons/warning-error-white.svg';
import CheckIcon from '@/assets/icons/check-circle.svg';

const props = defineProps<{
  stock?: number;
}>();
const outOfStock = computed(() => {
  if (!props.stock) return true;
  return props.stock === 0 || props.stock < 0;
});
const colorClass = computed(() => {
  if (!props.stock) return 'bg-rose-500';
  return [
    { 'bg-green-600': props.stock > 50 },
    { 'bg-orange-500': props.stock < 50 && props.stock > 0 },
    { 'bg-rose-500': outOfStock.value },
  ];
});
</script>

<style scoped></style>
