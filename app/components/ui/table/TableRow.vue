<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <tr
    :class="
      cn('border-b border-border transition-colors data-[state=selected]:bg-slate-100 dark:data-[state=selected]:bg-slate-800', props.class)
    "
  >
    <slot />
  </tr>
</template>
