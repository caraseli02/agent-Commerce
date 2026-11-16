<template>
  <div
    class="absolute z-10 flex items-center gap-1 px-1.5 py-0.5 md:px-2 md:py-1"
    :class="[
      floating
        ? 'left-1.5 top-1.5 max-w-[calc(100%-0.75rem)] rounded-full shadow-xs md:left-2 md:top-2 md:gap-1.5'
        : 'left-0 top-0 max-w-full rounded-br-lg md:gap-2',
      colorClass,
    ]"
  >
    <WarningIcon v-if="outOfStock" class="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" />
    <CheckIcon v-else class="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" :class="lowStock ? 'text-amber-700' : 'text-success'" />
    <span
      class="truncate font-semibold leading-tight tabular-nums"
      :class="floating ? 'text-[11px] md:text-xs' : 'text-[10px] md:text-[11px]'"
    >
      <span class="md:hidden">{{ outOfStock ? 'Backorder' : `${stock} in stock` }}</span>
      <span class="hidden md:inline">{{ outOfStock ? `${stock} in stock backorder only` : `${stock} in stock` }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import WarningIcon from '@/assets/icons/warning-error-white.svg';
import CheckIcon from '@/assets/icons/check-circle.svg';

const props = defineProps<{
  stock?: number;
  /** Inset pill over card media instead of a tab in the corner. */
  floating?: boolean;
}>();
const outOfStock = computed(() => !props.stock || props.stock < 0);
const lowStock = computed(() => !outOfStock.value && props.stock! < 50);
// A status readout: neutral pill with a coloured indicator; backorder keeps the alert fill and its white icon.
const colorClass = computed(() => {
  if (outOfStock.value) return 'bg-rose-700 text-white';
  return 'bg-card/95 text-foreground ring-1 ring-inset ring-border';
});
</script>
