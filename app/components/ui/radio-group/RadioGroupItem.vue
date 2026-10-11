<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import { RadioGroupIndicator, RadioGroupItem, type RadioGroupItemProps, useForwardProps } from 'radix-vue';
import { Circle } from '@lucide/vue';
import { cn } from '@/lib/utils';

const props = defineProps<RadioGroupItemProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <RadioGroupItem
    v-bind="forwardedProps"
    :class="
      cn(
        'peer aspect-square h-4 w-4 shrink-0 rounded-full border border-slate-600 text-blue-500 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-blue-500 dark:border-slate-50 dark:text-slate-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300',
        props.class,
      )
    "
  >
    <RadioGroupIndicator class="flex items-center justify-center">
      <slot>
        <Circle class="h-2.5 w-2.5 fill-current text-current" />
      </slot>
    </RadioGroupIndicator>
  </RadioGroupItem>
</template>
