<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    label: string;
    class?: HTMLAttributes['class'];
    testId?: string;
  }>(),
  {
    class: undefined,
    testId: undefined,
  }
);
</script>

<template>
  <div
    :aria-label="label"
    :data-testid="testId"
    :class="
      cn(
        'max-w-full overflow-x-auto rounded-xl scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        props.class
      )
    "
    role="region"
    tabindex="0"
  >
    <slot />
  </div>
</template>
