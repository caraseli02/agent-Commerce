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
      cn('focus-visible:!outline-[0.5px] focus-visible:outline-blue-500 pl-2 flex h-11 w-full rounded-md border border-input', props.class)
    "
  />
</template>
