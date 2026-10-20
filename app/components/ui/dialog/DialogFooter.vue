<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';
import { dialogFooterVariants, type DialogFooterVariants } from '.';

const props = defineProps<{ variant?: DialogFooterVariants['variant']; class?: HTMLAttributes['class'] }>();
</script>

<template>
  <div
    :class="
      cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-x-2', dialogFooterVariants({ variant: props.variant }), props.class)
    "
  >
    <slot />
  </div>
</template>
