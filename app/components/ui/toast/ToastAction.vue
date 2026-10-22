<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import { ToastAction, type ToastActionProps } from 'radix-vue';
import { cn } from '@/lib/utils';

const props = defineProps<ToastActionProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});
</script>

<template>
  <ToastAction
    v-bind="delegatedProps"
    :class="
      cn(
        'inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-muted focus:outline-none focus:ring-1 focus:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-destructive-foreground/40 group-[.destructive]:hover:border-destructive-foreground group-[.destructive]:hover:bg-destructive-foreground group-[.destructive]:hover:text-destructive group-[.destructive]:focus:ring-destructive-foreground dark:border-zinc-800 dark:hover:bg-zinc-800 dark:focus:ring-zinc-300',
        props.class,
      )
    "
  >
    <slot />
  </ToastAction>
</template>
