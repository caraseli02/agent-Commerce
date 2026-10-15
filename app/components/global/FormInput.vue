<template>
  <div>
    <UiLabel v-if="label" :for="inputId" class="mb-1 block">
      {{ label }}
    </UiLabel>
    <div class="relative">
      <div
        v-if="icon"
        class="absolute top-1/2 -translate-y-1/2 left-px w-11 h-[40px] bg-[#F5F5F5] flex items-center justify-center rounded-l-md border-r border-border"
      >
        <component :is="icon" class="w-5 h-5 text-slate-500" />
      </div>
      <UiInput
        :id="inputId"
        :model-value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        :class="[
          'pr-3 text-sm',
          error ? 'border-rose-500' : '',
          disabled && showDisabledStyles
            ? 'disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none'
            : '',
          icon ? 'pl-[52px]' : 'pl-3',
          size === 'lg' ? 'h-auto py-2.5' : 'h-auto py-2',
        ]"
        :disabled="disabled"
        @update:model-value="handleInput"
      />
    </div>
    <p v-if="error" :id="errorId" role="alert" class="mt-1 text-xs leading-normal text-rose-500">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useId, type PropType } from 'vue';

defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  type: {
    type: String as PropType<'text' | 'number' | 'tel' | 'email'>,
    required: false,
    default: 'text',
  },
  size: {
    type: String as PropType<'default' | 'lg'>,
    required: false,
    default: 'default',
  },
  label: {
    type: String,
    default: undefined,
  },
  placeholder: {
    type: String,
    default: undefined,
  },
  error: {
    type: String,
    default: undefined,
  },
  // eslint-disable-next-line vue/require-prop-types
  icon: {
    required: false,
    default: undefined,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  showDisabledStyles: {
    type: Boolean,
    required: false,
    default: true,
  },
});

const emits = defineEmits(['update:modelValue']);
const inputId = useId();
const errorId = `${inputId}-error`;

// UiInput's v-model casts `type="number"` values to numbers; the wrapper keeps emitting strings.
const handleInput = (value: string | number) => {
  emits('update:modelValue', String(value));
};
</script>
