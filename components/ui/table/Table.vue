<script setup lang="ts">
import type { HTMLAttributes, StyleValue } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
  tableStyle?: StyleValue;
}>();
</script>

<template>
  <div class="relative w-full rounded-xl">
    <table :class="cn('w-full min-w-max caption-bottom text-sm', props.class)" :style="props.tableStyle">
      <slot />
    </table>
  </div>
</template>
