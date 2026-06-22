<template>
  <form
    action=""
    class="border border-border rounded px-2.5 w-full transition-colors duration-300 focus-within:border-blue-500"
    @submit.prevent=""
  >
    <label class="flex items-center">
      <SearchIcon class="w-5 h-5 text-border flex-shrink-0" />
      <input
        :value="modelValue"
        type="search"
        placeholder="Search favorites"
        class="bg-transparent flex-1 px-2 py-2.5 w-full text-sm placeholder:text-gray-500 focus:outline-none"
        @input="handleInput"
      />
      <FiltersIcon class="w-5 h-5 text-border flex-shrink-0" />
    </label>
  </form>
</template>

<script setup lang="ts">
import SearchIcon from '@/assets/icons/search.svg';
import FiltersIcon from '@/assets/icons/filters.svg';

defineProps({
  modelValue: {
    type: String,
    required: true,
  },
});

const emits = defineEmits(['update:modelValue']);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;

  emits('update:modelValue', target.value);
};
</script>
