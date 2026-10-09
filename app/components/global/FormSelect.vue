<template>
  <div class="relative" :class="[error ? 'mb-4' : '']">
    <div v-if="label" class="text-sm text-slate-500 mb-1">
      {{ label }}
    </div>
    <button
      type="button"
      class="flex items-center justify-between px-3 text-sm w-full border transition-colors duration-300 focus:outline-none"
      :class="[
        error ? 'border-red' : showOptions ? 'border-blue-500' : 'border-border',
        disabled && showDisabledStyles ? 'disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none' : '',
        size === 'lg' ? 'py-[9px] rounded-lg h-11' : 'py-2 rounded h-10',
      ]"
      :disabled="disabled"
      @click="showOptions = !showOptions"
    >
      <span
        class="flex items-center text-left truncate"
        :class="{
          'text-slate-500': !modelValue,
          'font-semibold text-slate-500': checkboxes,
        }"
      >
        <component :is="icon" v-if="icon" class="w-6 h-6 text-slate-500 mr-2" />
        <img
          v-if="modelValue?.icon && typeof modelValue.icon === 'string'"
          :src="modelValue.icon"
          :alt="modelValue.label"
          class="w-8 rounded mr-2"
          loading="lazy"
        />
        <component :is="modelValue.icon" v-else-if="modelValue?.icon" class="w-6 h-6 text-slate-500 mr-2" />
        <span :class="[disabled ? 'text-gray-500' : 'text-slate-500']">
          {{ modelValue?.label || placeholder }}
        </span>
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        class="w-5 h-5 transition-all duration-300"
        :class="[showOptions ? 'rotate-180' : '', disabled ? 'text-gray-500' : 'text-slate-500']"
      >
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="m5.836 8.332 4.167 3.333 4.166-3.333"
        />
      </svg>
    </button>
    <Transition name="fade-full">
      <div
        v-if="showOptions"
        v-click-outside="() => (showOptions = false)"
        class="absolute -bottom-1 left-0 translate-y-full w-full bg-white rounded-md overflow-y-auto scrollbar-thin shadow-m px-3 py-[15px]"
        :class="[checkboxes ? 'max-h-[200px]' : 'max-h-[250px]']"
      >
        <div v-if="search" class="mb-[15px]">
          <div class="text-sm text-slate-500 mb-[5px]">Search {{ label }}</div>
          <label class="relative flex items-center border border-border rounded px-3">
            <SearchIcon class="w-[18px] h-[18px] text-gray-500" />
            <input
              v-model="searchValue"
              type="search"
              :placeholder="`Search ${label}`"
              class="bg-transparent flex-1 pl-2 pr-8 py-[9px] w-full text-sm placeholder:text-gray-500 focus:outline-none"
            />
            <Transition name="fade">
              <XIcon v-if="searchValue" class="w-[18px] h-[18px] text-gray-500 cursor-pointer" @click="searchValue = ''" />
            </Transition>
          </label>
        </div>
        <template v-if="checkboxes">
          <label
            v-for="(option, index) in filteredOptions"
            :key="index"
            class="group flex items-center cursor-pointer py-[9px] px-2.5 transition-colors duration-300 hover:bg-[#F2F2F2] rounded-[5px]"
          >
            <input
              :value="option.value === modelValue?.value"
              :checked="option.value === modelValue?.value"
              type="radio"
              name="option"
              class="sr-only"
              @change="inputHandler(option)"
            />
            <div
              class="flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded mt-px border transition-colors duration-300 mr-2.5"
              :class="[
                option.value === modelValue?.value ? 'bg-blue-500 border-blue-500 ' : 'bg-white  border-border group-hover:border-gray-300',
              ]"
            >
              <CheckIcon v-if="option.value === modelValue?.value" class="w-4 text-white" />
            </div>
            <component :is="option.icon" v-if="option.icon" class="w-6 h-6 text-slate-500 mr-2" />
            <span
              class="text-sm font-Inter text-slate-500 font-semibold truncate transition-colors duration-300 group-hover:text-neutral-700"
              :class="[option.value === modelValue?.value ? 'text-neutral-700' : '']"
            >
              {{ option.label }}
            </span>
          </label>
        </template>
        <template v-else>
          <button
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            class="flex w-full px-2.5 py-[9px] text-left rounded-[5px] text-slate-500 transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-neutral-700"
            :class="[option.value === modelValue?.value ? 'text-blue-500' : '']"
            @click="inputHandler(option)"
          >
            <img
              v-if="option?.icon && typeof option.icon === 'string'"
              :src="option?.icon"
              :alt="option.label"
              class="w-8 rounded mr-2"
              loading="lazy"
            />
            <component :is="option.icon" v-else-if="option?.icon" class="w-6 h-6 mr-2" />
            <span>
              {{ option.label }}
            </span>
          </button>
        </template>
      </div>
    </Transition>
    <Transition name="fade">
      <div v-if="error" class="absolute -bottom-1 left-0 translate-y-full pointer-events-none text-xs leading-normal text-rose-500">
        {{ error }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { FormSelectOption } from '~~/types';
import CheckIcon from '@/assets/icons/check.svg';
import SearchIcon from '@/assets/icons/search.svg';
import XIcon from '@/assets/icons/x.svg';

const props = defineProps({
  modelValue: {
    type: Object as PropType<FormSelectOption>,
    required: false,
    default: undefined,
  },
  label: {
    type: String,
    default: undefined,
  },
  placeholder: {
    type: String,
    default: undefined,
  },
  options: {
    type: Array as PropType<FormSelectOption[]>,
    required: true,
  },
  size: {
    type: String as PropType<'default' | 'lg'>,
    required: false,
    default: 'default',
  },
  disabled: Boolean,
  checkboxes: Boolean,
  // eslint-disable-next-line vue/require-prop-types
  icon: {
    required: false,
    default: undefined,
  },
  search: Boolean,
  error: {
    type: String,
    default: undefined,
  },
  showDisabledStyles: {
    type: Boolean,
    required: false,
    default: true,
  },
});

const emits = defineEmits(['update:modelValue']);

const searchValue = ref('');

const showOptions = ref(false);

const filteredOptions = computed(() => {
  return props.options.filter((e) => {
    return e.label.toLowerCase().includes(searchValue.value.toLowerCase());
  });
});

const inputHandler = (option: FormSelectOption) => {
  emits('update:modelValue', option);
  showOptions.value = false;
};
</script>
