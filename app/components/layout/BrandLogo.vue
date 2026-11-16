<template>
  <span class="inline-flex items-center text-current">
    <span v-if="compact" class="inline-flex h-8 w-8 items-center justify-center text-[15px] font-bold tracking-[-0.04em]">CM</span>
    <span
      v-if="!compact"
      class="flex items-baseline gap-1 whitespace-nowrap leading-none tracking-[-0.015em]"
      :class="size === 'sm' ? 'text-[15px]' : 'text-[17px]'"
    >
      <span class="font-bold">Components</span>
      <span class="font-medium opacity-60" :class="hideSecondWordOnMobile ? 'max-sm:hidden' : ''">Marketplace</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

defineProps({
  // Mark only: the collapsed dashboard rail and other tight spaces.
  compact: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String as PropType<'sm' | 'md'>,
    default: 'md',
  },
  hideSecondWordOnMobile: {
    type: Boolean,
    default: false,
  },
});
</script>
