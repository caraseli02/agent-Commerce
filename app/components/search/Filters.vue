<template>
  <div v-if="filteredData.length" class="mb-[30px] md:mb-[60px]">
    <div class="container">
      <UiButton class="w-full md:hidden" @click="showSearchFiltersModal = true">
        <FiltersIcon class="w-6 h-6 mr-2" />
        <span>Filters</span>
      </UiButton>
      <div class="hidden items-center justify-between md:flex">
        <div class="font-medium">Filters</div>
        <div class="flex items-center">
          <div class="flex items-center text-slate-500 select-none mr-[30px]">
            <EyeClosedIcon v-if="!showFilters" class="w-5 h-5 mr-2" />
            <EyeIcon v-else class="w-5 h-5 mr-2" />
            <UiLabel for="search-filters-visibility" class="mr-[15px] cursor-pointer"> Filters </UiLabel>
            <UiSwitch id="search-filters-visibility" :checked="showFilters" @update:checked="showFilters = $event" />
          </div>
          <UiButton class="group">
            <ResetIcon class="w-5 h-5 mr-2 transition-transform duration-300 group-hover:rotate-[360deg]" />
            <span
              @click="
                Emitter.emit('reset-products-filters', true);
                checkedOptions = [];
              "
            >
              Reset Filters
            </span>
          </UiButton>
        </div>
      </div>
      <Transition name="slide-from-bottom">
        <div v-if="showFilters" class="hidden grid-cols-3 gap-5 mt-5 md:grid lg:grid-cols-4 xl:grid-cols-6">
          <SearchFilter
            v-for="(filter, index) in filteredData"
            :key="getFilterSlug(filter.feature)"
            :filter="filter.feature"
            @close="removeItem(index)"
          />
          <div class="flex flex-col items-center pt-[60px] pb-10">
            <div class="text-sm font-medium text-slate-500 mb-5">Add/Remove Filter</div>
            <UiButton
              size="icon"
              class="w-14 h-14 rounded-full transition-transform duration-300 hover:rotate-[360deg]"
              @click="showAddRemoveFilterModal = true"
            >
              <PlusIcon class="w-[30px] h-[30px]" />
            </UiButton>
          </div>
        </div>
      </Transition>
    </div>
  </div>
  <Teleport to="body">
    <Transition name="slide-from-bottom">
      <LayoutSearchFiltersModal
        v-if="showSearchFiltersModal"
        @close="showSearchFiltersModal = false"
        @show-add-filters-modal="showAddRemoveFilterModal = true"
      />
    </Transition>
    <Transition name="slide-from-top">
      <LayoutAddRemoveSearchFilter
        v-if="showAddRemoveFilterModal && productFiltersData"
        :filters="productFiltersData"
        @update-visible-filters="productFiltersData = $event"
        @close="showAddRemoveFilterModal = false"
      />
    </Transition>
    <Transition name="fade">
      <div
        v-if="showAddRemoveFilterModal"
        class="fixed z-[70] top-0 left-0 w-full h-full bg-[#333333]/70 backdrop-blur-[2px] cursor-pointer"
        @click="showAddRemoveFilterModal = false"
      />
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { PlusIcon } from '@lucide/vue';
import Emitter from 'tiny-emitter/instance.js';
import FiltersIcon from '@/assets/icons/filters.svg';
import EyeIcon from '@/assets/icons/eye.svg';
import EyeClosedIcon from '@/assets/icons/eye-closed.svg';
import ResetIcon from '@/assets/icons/reset.svg';
import type { FilterOptions, ProductFilters, ProductFiltersWrapper, SearchData, SearchFiltersCategories } from '~~/types/product';

const props = defineProps<{
  filters: ProductFilters | null;
  atPage: number | 1;
  perPage: number | 10;
  keyword: string | '';
}>();

const showSearchFiltersModal = ref(false);
const showAddRemoveFilterModal = ref(false);

const parseFilters = (filters: ProductFilters | null): ProductFiltersWrapper[] | null => {
  if (!filters) {
    return null;
  }

  const data: ProductFiltersWrapper[] = [];
  let index = 0;

  const dataArray = Object.entries(filters);

  dataArray.forEach((item) => {
    const key = item[0];
    const value = item[1];

    data.push({
      feature: { [key]: value },
      checked: value[0]?.checked || index < 11,
    });

    index++;
  });

  return data;
};

const productFiltersData = ref<ProductFiltersWrapper[] | null>(props.filters ? parseFilters(props.filters) : null);
const filteredData = ref<ProductFiltersWrapper[]>([]);

const showFilters = ref(true);
const checkedOptions = ref<SearchFiltersCategories[]>([]);

productFiltersData.value = parseFilters(props.filters);

const filterData = () => {
  filteredData.value = productFiltersData.value?.filter((item) => item.checked) ?? [];
};

const removeItem = (index: number) => {
  filteredData.value.splice(index, 1);
};

const getFilterSlug = (filter: ProductFilters) => {
  const key = Object.keys(filter)[0];
  return key ? filter[key]?.[0]?.FeatureID : undefined;
};

filterData();

watch(
  () => props.filters,
  () => {
    productFiltersData.value = parseFilters(props.filters);
    filterData();
  },
  { deep: true },
);

Emitter.on('product-keyword-change', async (value: { keyword: string; products: SearchData }) => {
  productFiltersData.value = parseFilters(value.products.filters);
  checkedOptions.value = [];
  filterData();
});

Emitter.on('add-filter-option', async (options: FilterOptions[]) => {
  for (const option of options) {
    const item = checkedOptions.value.find(
      (x) => x.FeatureName === option.rawFilter.FeatureName && x.FeatureValue === option.rawFilter.FeatureValue,
    );

    if (item) {
      continue;
    }

    checkedOptions.value.push(option.rawFilter);
  }

  Emitter.emit('register-filter-option', checkedOptions.value);
});

Emitter.on('remove-filter-option', async (options: FilterOptions[]) => {
  for (const option of options) {
    const itemIndex = checkedOptions.value.findIndex(
      (x) => x.FeatureName === option.rawFilter.FeatureName && x.FeatureValue === option.rawFilter.FeatureValue,
    );

    if (itemIndex < 0) {
      continue;
    }

    checkedOptions.value.splice(itemIndex, 1);
  }

  Emitter.emit('register-filter-option', checkedOptions.value);
});

watch([productFiltersData], async ([_productFiltersData]) => {
  filterData();
});
</script>
