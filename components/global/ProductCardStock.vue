<template>
  <div
    class="absolute top-0 left-0 z-10 flex max-w-full items-center gap-1 rounded-br-lg px-1.5 py-0.5 md:gap-2 md:px-2 md:py-1"
    :class="colorClass"
  >
    <WarningIcon v-if="outOfStock" class="h-3.5 w-3.5 shrink-0 !text-white md:h-4 md:w-4" />
    <CheckIcon v-else class="h-3.5 w-3.5 shrink-0 text-white md:h-4 md:w-4" />
    <span class="truncate text-[10px] font-semibold leading-tight text-white md:text-[11px]">
      <span class="md:hidden">{{ outOfStock ? 'Backorder' : stock }}</span>
      <span class="hidden md:inline">{{ outOfStock ? `${stock} in stock backorder only` : `${stock} in stock` }}</span>
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
  if (!props.stock) return 'bg-rose-600';
  return [
    { 'bg-green-800': props.stock > 50 },
    { 'bg-orange-600': props.stock < 50 && props.stock > 0 },
    { 'bg-rose-600': outOfStock.value },
  ];
});
</script>

<style scoped></style>
