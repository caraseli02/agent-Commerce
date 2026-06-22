<template>
  <div class="fixed z-[90] top-0 left-0 w-screen h-screen flex items-center justify-center pointer-events-none">
    <div
      class="relative z-10 w-[700px] max-w-[calc(100vw-32px)] pt-4 pb-8 bg-white rounded-md shadow-xs pointer-events-auto md:pt-6 md:pb-8"
    >
      <div class="flex items-center justify-between px-4 mb-10 md:px-6">
        <div class="flex items-center">
          <FiltersIcon class="w-6 h-6 text-slate-500 mr-2" />
          <span class="text-lg font-medium text-slate-500"> Add/Remove Filters </span>
        </div>
        <button
          class="rounded w-8 h-8 bg-[#F2F2F2] flex items-center justify-center text-gray-500 transition-colors duration-300 hover:text-slate-500"
          @click="$emit('close')"
        >
          <XIcon class="w-[15px] h-[15px]" />
        </button>
      </div>
      <div class="px-4 mb-4 md:px-6">
        <label class="relative flex items-center border border-border rounded px-3">
          <SearchIcon class="w-[18px] h-[18px] text-gray-500" />
          <input
            v-model="searchValue"
            type="search"
            placeholder="Search parameters"
            class="bg-transparent flex-1 pl-2 pr-8 py-[9px] w-full text-sm placeholder:text-gray-500 focus:outline-none"
          />
          <Transition name="fade">
            <XIcon v-if="searchValue" class="w-[18px] h-[18px] text-gray-500 cursor-pointer" @click="searchValue = ''" />
          </Transition>
        </label>
      </div>
      <div class="mb-[34px] lg:mb-[42px]">
        <div class="grid grid-cols-[repeat(2,1fr),auto] gap-2 px-6 mb-2 md:px-8">
          <button class="flex items-center" @click="parametersOrder ? (parametersOrder = 0) : (parametersOrder = 1)">
            <span class="text-sm font-medium tracking-[0.6px] mr-2"> Parameters </span>
            <CaretIcon
              class="w-5 h-5 text-slate-500 transition-transform duration-300"
              :class="[parametersOrder ? 'rotate-90' : '-rotate-90']"
            />
          </button>
          <button class="flex items-center" @click="productsOrder ? (productsOrder = 0) : (productsOrder = 1)">
            <span class="text-sm font-medium tracking-[0.6px] mr-2"> Products </span>
            <CaretIcon
              class="w-5 h-5 text-slate-500 transition-transform duration-300"
              :class="[productsOrder ? 'rotate-90' : '-rotate-90']"
            />
          </button>
          <div class="w-[18px] h-[18px]" />
        </div>
        <div class="pr-1">
          <div v-if="items.length > 0" class="max-h-[40vh] overflow-y-auto scrollbar-thin overscroll-contain pl-4 pr-3 md:pl-6">
            <div
              v-for="item in filteredItems"
              :key="item.parameter"
              class="group grid grid-cols-[repeat(2,1fr),auto] gap-2 rounded-[3px] odd:bg-[#F2F2F2] px-2 pt-[5px] pb-1.5 cursor-pointer transition-colors duration-300 hover:text-blue-500"
              @click="toggleItem(item)"
            >
              <div class="text-xs font-medium font-Inter leading-tight">
                {{ item.parameter }}
              </div>
              <div class="text-xs font-medium font-Inter leading-tight px-3">
                {{ item.products }}
              </div>
              <div
                class="flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded mt-px border transition-colors duration-300"
                :class="[
                  item.checked ? 'bg-blue-500 border-blue-500 group-hover:bg-white' : 'bg-white  border-border group-hover:border-gray-300',
                ]"
              >
                <CheckIcon v-if="item.checked" class="w-4 text-white transition-colors duration-300 group-hover:text-blue-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex justify-center gap-2.5 px-4 md:px-6">
        <button class="flex bg-gray-100 rounded px-[26px] py-[11px] text-sm font-medium text-slate-500" @click="$emit('close')">
          Cancel
        </button>
        <button class="flex bg-blue-500 rounded px-[34px] py-[11px] text-sm font-medium text-white" @click="saveFilters()">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import XIcon from '@/assets/icons/x.svg';
import FiltersIcon from '@/assets/icons/filters.svg';
import SearchIcon from '@/assets/icons/search.svg';
import CaretIcon from '@/assets/icons/caret-left.svg';
import CheckIcon from '@/assets/icons/check.svg';
import type { AddFilterInterface, ProductFiltersWrapper, SearchFiltersCategories } from '~/model/products/response/ProductSearchResponse';
import { documentUtil } from '~/utils';

const props = defineProps<{
  filters: ProductFiltersWrapper[];
}>();

const emits = defineEmits(['close', 'update-visible-filters']);

const searchValue = ref('');

const items = ref([] as AddFilterInterface[]);
const parametersOrder = ref(0);
const productsOrder = ref(0);

const filteredItems = computed(() => {
  const itemsToReturn = items.value.filter((e: AddFilterInterface) => e.parameter.toLowerCase().includes(searchValue.value.toLowerCase()));

  if (productsOrder.value) {
    itemsToReturn.sort((a, b) => {
      const aCount = a.products ?? 0;
      const bCount = b.products ?? 0;
      if (aCount > bCount) {
        return productsOrder.value;
      }
      if (aCount < bCount) {
        return -productsOrder.value;
      }
      return 0;
    });
  } else if (parametersOrder.value) {
    itemsToReturn.sort((a, b) => {
      if (a.parameter > b.parameter) {
        return parametersOrder.value;
      }
      if (a.parameter < b.parameter) {
        return -parametersOrder.value;
      }
      return 0;
    });
  }

  return itemsToReturn;
});

const toggleItem = (item: AddFilterInterface) => {
  const checkedFilter = items.value.find((e: AddFilterInterface) => e.parameter.toLowerCase() === item.parameter.toLowerCase());
  if (!checkedFilter) {
    return;
  }
  checkedFilter.checked = !checkedFilter.checked;
};

const saveFilters = () => {
  emits('update-visible-filters', items.value);
  emits('close');
};

const parseFilters = () => {
  let index = 0;

  if (!props.filters?.length) {
    return;
  }

  for (const wrapper of props.filters) {
    const item = {} as AddFilterInterface;
    const featureKeys = Object.keys(wrapper.feature);

    if (!featureKeys.length) {
      continue;
    }

    const featureKey = featureKeys[0];
    const featureValues = wrapper.feature[featureKey] ?? [];

    item.filter = featureValues;
    item.feature = wrapper.feature;
    item.parameter = featureKey;
    item.checked = wrapper.checked ?? index < 11;
    item.products = featureValues.reduce((total: number, obj: SearchFiltersCategories) => obj.count + total, 0);

    index++;

    items.value.push(item);
  }
};

parseFilters();

watch(parametersOrder, (newVal) => {
  if (newVal) {
    productsOrder.value = 0;
  }
});

watch(productsOrder, (newVal) => {
  if (newVal) {
    parametersOrder.value = 0;
  }
});

onMounted(() => {
  documentUtil.toggleBodyScroll();
});

onBeforeUnmount(() => {
  documentUtil.toggleBodyScroll();
});
</script>
