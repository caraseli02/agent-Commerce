<template>
  <span class="inline-flex items-center text-current" :class="size === 'sm' ? 'gap-2' : 'gap-2.5'">
    <!-- An IC package seen from above; the orange pin-1 dot is the orientation mark every chip carries. -->
    <svg viewBox="0 0 32 32" class="shrink-0" :class="size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'" aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <rect x="2" y="9" width="5" height="2.5" rx="1.25" />
        <rect x="2" y="14.75" width="5" height="2.5" rx="1.25" />
        <rect x="2" y="20.5" width="5" height="2.5" rx="1.25" />
        <rect x="25" y="9" width="5" height="2.5" rx="1.25" />
        <rect x="25" y="14.75" width="5" height="2.5" rx="1.25" />
        <rect x="25" y="20.5" width="5" height="2.5" rx="1.25" />
        <path
          d="M10.5 4h3.25a2.25 2.25 0 0 0 4.5 0h3.25A2.5 2.5 0 0 1 24 6.5v19a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 8 25.5v-19A2.5 2.5 0 0 1 10.5 4Z"
        />
      </g>
      <circle cx="12.25" cy="10" r="2" class="fill-signal" />
    </svg>
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
