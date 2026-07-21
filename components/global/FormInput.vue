<template>
  <div>
    <label v-if="label" :for="inputId" class="mb-1 block text-sm text-slate-500">
      {{ label }}
    </label>
    <div class="relative">
      <div
        v-if="icon"
        class="absolute top-1/2 -translate-y-1/2 left-px w-11 h-[40px] bg-[#F5F5F5] flex items-center justify-center rounded-l-lg border-r border-border"
      >
        <component :is="icon" class="w-5 h-5 text-slate-500" />
      </div>
      <input
        :id="inputId"
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        class="bg-transparent border pr-3 text-sm !placeholder:text-gray-500 w-full transition-colors duration-300 focus:outline-none"
        :class="[
          error ? 'border-rose-500' : 'border-border focus:border-blue-500',
          disabled && showDisabledStyles
            ? 'disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none'
            : '',
          icon ? 'pl-[52px]' : 'pl-3',
          size === 'lg' ? 'py-2.5 rounded-lg' : 'py-2 rounded',
        ]"
        :disabled="disabled"
        @input="handleInput"
      >
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

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;

  emits('update:modelValue', target.value);
};
</script>
