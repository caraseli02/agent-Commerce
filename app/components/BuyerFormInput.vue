<template>
  <div>
    <UiLabel :for="inputId" class="mb-1 block text-sm text-muted-foreground">
      {{ label }}
    </UiLabel>
    <div class="relative">
      <div
        v-if="icon"
        class="absolute top-1/2 -translate-y-1/2 left-px z-10 flex h-10 w-12 items-center justify-center rounded-l-lg border-r border-border bg-muted"
      >
        <component :is="icon" class="h-5 w-5 text-muted-foreground" />
      </div>
      <UiInput
        :id="inputId"
        v-model="model"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        :class="inputClasses"
      />
    </div>
    <p v-if="error" :id="errorId" role="alert" class="mt-1 text-xs leading-normal text-rose-500">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';
import type { Component, PropType } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  type: {
    type: String as PropType<'text' | 'number' | 'tel' | 'email'>,
    default: 'text',
  },
  size: {
    type: String as PropType<'default' | 'lg'>,
    default: 'default',
  },
  label: {
    type: String,
    required: true,
  },
  placeholder: {
    type: String,
    default: undefined,
  },
  error: {
    type: String,
    default: undefined,
  },
  icon: {
    type: Object as PropType<Component>,
    default: undefined,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  showDisabledStyles: {
    type: Boolean,
    default: true,
  },
});

const emits = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const inputId = useId();
const errorId = `${inputId}-error`;

const model = computed({
  get: () => props.modelValue,
  set: (value: string | number) => emits('update:modelValue', String(value)),
});

const inputClasses = computed(() =>
  cn(
    'w-full bg-transparent text-sm !placeholder:text-muted-foreground transition-colors duration-300',
    props.error ? 'border-rose-500 focus-visible:outline-rose-500' : 'focus-visible:outline-blue-500',
    // Icon rail is w-12 (3rem); pad with spacing-scale pl-14.
    props.icon ? 'pl-14' : undefined,
    props.size === 'lg' ? 'h-12 rounded-lg py-2.5' : 'h-11 rounded-md py-2',
    props.disabled && props.showDisabledStyles
      ? 'disabled:bg-muted disabled:text-muted-foreground disabled:border-border disabled:shadow-none'
      : undefined,
  ),
);
</script>
