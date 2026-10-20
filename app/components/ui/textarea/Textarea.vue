<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { useVModel } from '@vueuse/core';
import { cn } from '@/lib/utils';
import { textareaVariants, type TextareaVariants } from '.';

const props = defineProps<{
  variant?: TextareaVariants['variant'];
  class?: HTMLAttributes['class'];
  defaultValue?: string | number;
  modelValue?: string | number;
}>();

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void;
}>();

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
});
</script>

<template>
  <textarea v-model="modelValue" :class="cn(textareaVariants({ variant: props.variant }), props.class)" />
</template>
