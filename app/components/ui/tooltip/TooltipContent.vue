<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import {
  TooltipContent,
  type TooltipContentEmits,
  type TooltipContentProps,
  TooltipPortal,
  useForwardPropsEmits,
  TooltipArrow,
} from 'radix-vue';
import { cn } from '@/lib/utils';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<TooltipContentProps & { class?: HTMLAttributes['class'] }>(), {
  sideOffset: 4,
  class: undefined,
});

const emits = defineEmits<TooltipContentEmits>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          'data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade z-50 max-w-xs select-none rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium leading-snug text-primary-foreground shadow-md will-change-[transform,opacity]',
          props.class,
        )
      "
    >
      <slot />
      <TooltipArrow class="fill-primary z-10" size="8" />
    </TooltipContent>
  </TooltipPortal>
</template>
