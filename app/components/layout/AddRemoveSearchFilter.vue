<template>
  <div class="fixed z-[90] top-0 left-0 w-screen h-screen flex items-center justify-center pointer-events-none">
    <div
      class="relative z-10 w-[700px] max-w-[calc(100vw-32px)] pt-4 pb-8 bg-card rounded-md shadow-xs pointer-events-auto md:pt-6 md:pb-8"
    >
      <div class="flex items-center justify-between px-4 mb-10 md:px-6">
        <div class="flex items-center">
          <FiltersIcon class="w-6 h-6 text-muted-foreground mr-2" />
          <span class="text-lg font-medium text-muted-foreground"> Add/Remove Filters </span>
        </div>
        <UiButton variant="secondary" size="icon" class="w-8 h-8" aria-label="Close" @click="$emit('close')">
          <XIcon class="w-[15px] h-[15px]" />
        </UiButton>
      </div>
      <div class="px-4 mb-4 md:px-6">
        <UiLabel class="relative flex items-center gap-2">
          <SearchIcon class="w-[18px] h-[18px] text-muted-foreground" />
          <UiInput v-model="searchValue" type="search" placeholder="Search parameters" aria-label="Search parameters" class="flex-1" />
          <Transition name="fade">
            <UiButton
              v-if="searchValue"
              type="button"
              variant="ghost"
              size="icon"
              class="h-8 w-8 shrink-0"
              aria-label="Clear search"
              @click="searchValue = ''"
            >
              <XIcon class="w-[18px] h-[18px] text-muted-foreground" aria-hidden="true" />
            </UiButton>
          </Transition>
        </UiLabel>
      </div>
      <div class="mb-[34px] lg:mb-[42px]">
        <div class="grid grid-cols-[repeat(2,1fr)_auto] gap-2 px-6 mb-2 md:px-8">
          <UiButton
            variant="ghost"
            class="h-auto justify-start p-0"
            @click="parametersOrder ? (parametersOrder = 0) : (parametersOrder = 1)"
          >
            <span class="text-sm font-medium tracking-[0.6px] mr-2"> Parameters </span>
            <CaretIcon
              class="w-5 h-5 text-muted-foreground transition-transform duration-300"
              :class="[parametersOrder ? 'rotate-90' : '-rotate-90']"
            />
          </UiButton>
          <UiButton variant="ghost" class="h-auto justify-start p-0" @click="productsOrder ? (productsOrder = 0) : (productsOrder = 1)">
            <span class="text-sm font-medium tracking-[0.6px] mr-2"> Products </span>
            <CaretIcon
              class="w-5 h-5 text-muted-foreground transition-transform duration-300"
              :class="[productsOrder ? 'rotate-90' : '-rotate-90']"
            />
          </UiButton>
          <div class="w-[18px] h-[18px]" />
        </div>
        <div class="pr-1">
          <div v-if="items.length > 0" class="max-h-[40vh] overflow-y-auto scrollbar-thin overscroll-contain pl-4 pr-3 md:pl-6">
            <div
              v-for="item in filteredItems"
              :key="item.parameter"
              class="group grid grid-cols-[repeat(2,1fr)_auto] gap-2 rounded-[3px] odd:bg-[#F2F2F2] dark:odd:bg-muted px-2 pt-[5px] pb-1.5 cursor-pointer transition-colors duration-300 hover:text-blue-500"
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
                  item.checked ? 'bg-blue-500 border-blue-500 group-hover:bg-card' : 'bg-card  border-border group-hover:border-border',
                ]"
              >
                <CheckIcon v-if="item.checked" class="w-4 text-white transition-colors duration-300 group-hover:text-blue-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex justify-center gap-2.5 px-4 md:px-6">
        <UiButton variant="secondary" @click="$emit('close')"> Cancel </UiButton>
        <UiButton @click="saveFilters()">Save</UiButton>
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
import type { AddFilterInterface, ProductFiltersWrapper, SearchFiltersCategories } from '~~/types/product';
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
    if (!featureKey) continue;
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
