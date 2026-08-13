<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import {
  DialogClose,
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from 'radix-vue';
import { X } from '@lucide/vue';
import { type SheetVariants, sheetVariants } from '.';
import { cn } from '@/lib/utils';

interface SheetContentProps extends DialogContentProps {
  class?: HTMLAttributes['class'];
  side?: SheetVariants['side'];
  disabledPortal?: boolean;
  portalTo?: string;
  disabledOverlay?: boolean;
  overlayClassName?: string;
  hiddeCloseButton?: boolean;
}

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<SheetContentProps>();

const emits = defineEmits<DialogContentEmits>();

const delegatedProps = computed(() => {
  const { class: _, side, ...delegated } = props;

  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <DialogPortal :disabled="disabledPortal" :to="portalTo">
    <DialogOverlay
      v-if="!disabledOverlay"
      :class="
        cn(
          'fixed inset-0 z-50 bg-[rgba(47,50,65,0.10)] backdrop-blur-[7.5px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          props.overlayClassName
        )
      "
    />
    <DialogContent :class="cn(sheetVariants({ side }), props.class)" v-bind="{ ...forwarded, ...$attrs }">
      <slot />

      <DialogClose
        v-if="!hiddeCloseButton"
        class="fixed right-4 top-3.5 inline-flex h-8 w-8 items-center justify-center rounded-sm bg-light-300 p-0 leading-none opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-100 dark:ring-offset-slate-950 dark:focus:ring-slate-300 dark:data-[state=open]:bg-slate-800"
      >
        <X class="w-5 h-5 text-slate-500 dark:text-slate-400" />
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
