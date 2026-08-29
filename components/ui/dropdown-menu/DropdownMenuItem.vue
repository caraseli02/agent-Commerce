<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import { DropdownMenuItem, type DropdownMenuItemProps, useForwardProps } from 'radix-vue';
import { cn } from '@/lib/utils';

const props = defineProps<DropdownMenuItemProps & { class?: HTMLAttributes['class']; inset?: boolean }>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <DropdownMenuItem
    v-bind="forwardedProps"
    :class="
      cn(
        'cursor-pointer relative flex select-none items-center rounded-lg px-2 py-1.5 text-sm text-neutral-700 outline-none transition-colors focus:bg-light-300 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-slate-800 dark:focus:text-slate-50',
        inset && 'pl-8',
        props.class,
      )
    "
  >
    <slot />
  </DropdownMenuItem>
</template>
