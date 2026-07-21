<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div class="relative w-full rounded-xl">
    <table :class="cn('w-full min-w-max caption-bottom text-sm', props.class)">
      <slot />
    </table>
  </div>
</template>
