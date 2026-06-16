<template>
  <div class="flex flex-col bg-white rounded-md shadow-m">
    <div class="flex items-start justify-between p-2.5">
      <div class="font-Inter">
        <div class="text-xs font-semibold leading-tight truncate w-[140px] mb-[5px]">
          {{ FeatureName }}
        </div>
        <div class="text-xs leading-tight">
          ({{ totalProducts }})
        </div>
      </div>
      <button
        class="rounded w-[22px] h-[22px] bg-[#F2F2F2] flex items-center justify-center text-gray-500 transition-colors duration-300 hover:text-slate-500"
        @click="$emit('close')"
      >
        <XIcon class="w-[14px] h-[14px]" />
      </button>
    </div>
    <div class="px-2.5 mb-2.5">
      <label class="flex relative">
        <input
          v-model="searchValue"
          type="search"
          placeholder="Type here"
          class="w-full border border-border bg-white rounded px-2.5 pt-[5px] pb-1.5 pr-10 text-xs placeholder:text-gray-500 transition-colors duration-300 focus:outline-none focus:border-blue-500"
          @input="onInput"
        >
        <FiltersIcon class="absolute top-1/2 -translate-y-1/2 right-2.5 w-5 h-5 text-gray-500" />
      </label>
    </div>
    <div class="flex-1 pr-[5px]">
      <div class="grid grid-cols-1 gap-2 flex-1 max-h-[115px] overflow-y-auto scrollbar-thin pb-[13px]">
        <label
          v-for="option in options"
          :key="option.rawFilter.FeatureValue"
          class="group flex items-start justify-between cursor-pointer px-2.5"
        >
          <input
            type="checkbox"
            class="sr-only"
            @click="toggleOption(option)"
          >
          <span class="text-xs font-Inter transition-colors duration-300 group-hover:text-blue-500">
            {{ `${useTrimText(option.value + option.unit)} (${option.rawFilter.count})` }}
          </span>
          <div
            class="flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded mt-px border transition-colors duration-300"
            :class="[
              option.checked
                ? 'bg-blue-500 border-blue-500 group-hover:bg-white'
                : 'bg-white  border-border group-hover:border-gray-300',
            ]"
          >
            <CheckIcon
              v-if="option.checked"
              class="w-4 text-white transition-colors duration-300 group-hover:text-blue-500"
            />
          </div>
        </label>
      </div>
    </div>
    <button
      class="group flex items-center justify-between bg-gray-100 pr-[15px] py-2 pl-2.5"
      @click="handleAll"
    >
      <span class="text-xs transition-colors duration-300 group-hover:text-blue-500">
        {{ selectedAll ? 'Unselect All' : 'Select All' }}
      </span>
      <div
        class="flex items-center justify-center w-[18px] h-[18px] rounded border transition-colors duration-300"
        :class="[
          selectedAll
            ? 'bg-blue-500 border-blue-500 group-hover:bg-white'
            : 'bg-white  border-border group-hover:border-gray-300',
        ]"
      >
        <CheckIcon
          v-if="selectedAll"
          class="w-4 text-white transition-colors duration-300 group-hover:text-blue-500"
        />
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import Emitter from 'tiny-emitter/instance.js';
import FiltersIcon from '@/assets/icons/filters.svg';
import CheckIcon from '@/assets/icons/check.svg';
import XIcon from '@/assets/icons/x.svg';
import { useTrimText } from '@/composables/text';
import type { FilterOptions, ProductFilters } from '~/model/products/response/ProductSearchResponse';

defineEmits(['close', 'add-filter-option']);

const props = defineProps<{
  filter: ProductFilters | null;
}>();

watch(
  () => props.filter,
  () => {
    if (!props.filter) {
      return;
    }
    options.value = parseOptions();
  },
  { deep: true },
);

const searchValue = ref('');

const filter = ref(props.filter);
const options = ref([] as FilterOptions[]);

const onInput = () => {
  if (searchValue.value.trim() === '') {
    options.value = parseOptions();
  }
  else {
    options.value = parseOptions().filter((option) => {
      return option.value.toLowerCase().includes(searchValue.value.toLowerCase());
    });
  }
};

const parseOptions = (): FilterOptions[] => {
  if (!props.filter) {
    return [];
  }

  const key = Object.keys(props.filter)[0];

  if (!key) {
    return [];
  }

  const filtered = props.filter[key].filter(item => item.FeatureName === key) || [];

  return filtered.map(item => ({
    value: item.FeatureValue,
    unit: item.FeatureUnit,
    checked: item.checked || false,
    rawFilter: item,
  }));
};

options.value = parseOptions();

const toggleOption = (option: FilterOptions) => {
  option.checked = !option.checked;

  if (option.checked) {
    Emitter.emit('add-filter-option', [option]);
  }
  else {
    Emitter.emit('remove-filter-option', [option]);
  }
};

const FeatureName = computed(() => {
  return filter.value ? Object.keys(filter.value)[0] : '';
});

const selectedAll = computed(() => {
  return options.value.every(e => e.checked);
});

const totalProducts = computed(() => {
  return props.filter?.[FeatureName.value].reduce((total, obj) => obj.count + total, 0);
});

const handleAll = () => {
  options.value = options.value?.map((e) => {
    return {
      ...e,
      checked: !selectedAll.value,
    };
  });

  if (selectedAll.value) {
    Emitter.emit('add-filter-option', options.value);
  }
  else {
    Emitter.emit('remove-filter-option', options.value);
  }
};
</script>
