<template>
  <label
    class="flex relative border border-border bg-white rounded-lg overflow-hidden transition-colors duration-300 focus-within:border-blue-500"
    :class="[size === 'lg' ? 'h-11' : size === 'md' ? 'h-10' : 'h-9']"
  >
    <input
      :value="modelValue"
      type="search"
      :placeholder="placeholder"
      class="flex w-full px-3 pr-10 text-sm bg-white leading-[1.6] text-slate-500 placeholder:text-gray-500 font-normal placeholder:font-normal transition-colors duration-300 focus:outline-none focus:border-blue-500"
      :class="[size === 'lg' ? 'py-2.5 h-11' : size === 'md' ? 'py-1.5 h-10' : 'py-1.5 h-9']"
      @input="handleInput"
    >
    <XIcon v-if="modelValue" class="absolute top-1/2 -translate-y-1/2 right-3 w-5 h-5 text-slate-500 cursor-pointer" @click="clearSearch" />
    <SearchIcon v-else class="absolute top-1/2 -translate-y-1/2 right-3 w-5 h-5 text-gray-500" />
  </label>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import SearchIcon from '@/assets/icons/dashboard/search.svg';
import XIcon from '@/assets/icons/dashboard/x.svg';

defineProps({
  modelValue: {
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
  size: {
    type: String as PropType<'lg' | 'md' | 'sm'>,
    required: false,
    default: 'lg',
  },
});

const emits = defineEmits(['update:modelValue', 'clearSearch']);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;

  emits('update:modelValue', target.value);
};

const clearSearch = () => {
  emits('clearSearch');
};
</script>
