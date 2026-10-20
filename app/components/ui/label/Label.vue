<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import { Label, type LabelProps } from 'radix-vue';
import { cn } from '@/lib/utils';
import { labelVariants, type LabelVariants } from '.';

const props = defineProps<LabelProps & { variant?: LabelVariants['variant']; class?: HTMLAttributes['class'] }>();

const delegatedProps = computed(() => {
  const { class: _, variant: _variant, ...delegated } = props;

  return delegated;
});
</script>

<template>
  <Label v-bind="delegatedProps" :class="cn(labelVariants({ variant: props.variant }), props.class)">
    <slot />
  </Label>
</template>
