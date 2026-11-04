<script setup lang="ts">
import { type HTMLAttributes, ref } from 'vue';
import { useVModel } from '@vueuse/core';
import { cn } from '@/lib/utils';

const props = defineProps<{
  defaultValue?: string | number;
  modelValue?: string | number;
  class?: HTMLAttributes['class'];
}>();

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void;
}>();

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
});

// A template ref on <UiInput> points at the component, not the <input>; reach the element via `ref.value?.el`.
const el = ref<HTMLInputElement | null>(null);

defineExpose({ el });
</script>

<template>
  <input
    ref="el"
    v-model="modelValue"
    :class="
      cn(
        'flex h-11 w-full rounded-lg border border-input bg-card pl-3 text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
  />
</template>
