<template v-if="products">
  <section class="mb-10 md:mb-[60px]">
    <div v-if="totalItems" class="container">
      <div class="font-semibold font-Inter mb-[15px] md:hidden">Products Found ({{ totalItems }})</div>
      <div
        class="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-muted px-4 py-4 mb-6 md:grid-cols-[auto_auto] md:justify-start md:gap-x-6 md:gap-y-4 md:px-5 md:py-5 md:mb-8 lg:flex lg:flex-wrap lg:items-center lg:gap-4"
      >
        <div class="flex items-center">
          <UiLabel :for="showId" class="text-sm font-normal text-current leading-normal flex-shrink-0 mr-2.5">Show</UiLabel>
          <UiSelect :model-value="show.name" @update:model-value="selectShow">
            <UiSelectTrigger :id="showId" :class="triggerClass" class="min-w-[215px]">
              <UiSelectValue>{{ show.name }}</UiSelectValue>
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem v-for="option in showOptions" :key="option.name" :value="option.name">
                {{ option.name }}
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>
        </div>
        <div class="flex items-center lg:mr-auto">
          <UiLabel :for="sortById" class="text-sm font-normal text-current leading-normal flex-shrink-0 mr-2.5">Sort by</UiLabel>
          <UiSelect :model-value="sortByValue(sortBy)" @update:model-value="selectSortBy">
            <UiSelectTrigger :id="sortById" :class="triggerClass" class="min-w-[215px]">
              <UiSelectValue>{{ sortBy.label }}</UiSelectValue>
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem v-for="option in sortByOptions" :key="sortByValue(option)" :value="sortByValue(option)">
                {{ option.label }}
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>
        </div>
        <div class="flex items-center">
          <UiLabel :for="perPageId" class="text-sm font-normal text-current leading-normal flex-shrink-0 mr-2.5">Products on page</UiLabel>
          <UiSelect :model-value="String(perPage)" @update:model-value="selectPerPage">
            <UiSelectTrigger :id="perPageId" :class="triggerClass">
              <UiSelectValue>{{ perPage }}</UiSelectValue>
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem v-for="option in perPageOptions" :key="option" :value="String(option)">
                {{ option }}
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>
        </div>
      </div>
      <div class="flex items-center justify-center mb-8 md:justify-between xl:mb-8">
        <div class="hidden font-Inter font-semibold md:block">Products Found ({{ totalItems }})</div>
        <div class="flex items-center">
          <Transition name="fade">
            <UiButton v-if="atPage !== 1" variant="ghost" size="icon" class="mr-4" aria-label="Previous page" @click="atPage--">
              <ChevronRightIcon class="w-1.5 h-3 rotate-180" />
            </UiButton>
          </Transition>
          <Pagination
            v-model="atPage"
            :page-count="totalPages"
            :page-range="3"
            :hide-prev-next="true"
            page-link-class="searchProducts--pagination-item"
            prev-link-class="searchProducts--pagination-item_prev cursor-pointer text-mainPurple font-medium px-2"
            next-link-class="searchProducts--pagination-item_next cursor-pointer text-mainPurple font-medium px-2"
            active-class="searchProducts--pagination-item-active"
            class="flex items-center justify-center"
          >
            <template #breakViewContent>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 12 4" class="w-3 h-2 translate-y-1">
                <path
                  fill="#5E6278"
                  d="M1.943 3.11c-.302 0-.56-.107-.776-.319a1.03 1.03 0 0 1-.318-.775 1.019 1.019 0 0 1 .318-.766c.215-.212.474-.318.776-.318.291 0 .545.106.76.318a1.045 1.045 0 0 1 .174 1.317c-.1.166-.232.299-.398.398a1.035 1.035 0 0 1-.536.144Zm4.06 0c-.301 0-.56-.107-.775-.319a1.03 1.03 0 0 1-.319-.775 1.019 1.019 0 0 1 .319-.766c.215-.212.474-.318.775-.318.292 0 .545.106.76.318a1.045 1.045 0 0 1 .175 1.317c-.1.166-.232.299-.398.398a1.035 1.035 0 0 1-.537.144Zm4.06 0c-.301 0-.56-.107-.775-.319a1.03 1.03 0 0 1-.318-.775 1.019 1.019 0 0 1 .318-.766c.216-.212.474-.318.776-.318.291 0 .545.106.76.318a1.045 1.045 0 0 1 .174 1.317c-.1.166-.232.299-.397.398a1.035 1.035 0 0 1-.537.144Z"
                />
              </svg>
            </template>
          </Pagination>
          <Transition name="fade">
            <UiButton v-if="totalPages !== atPage" variant="ghost" size="icon" class="ml-4" aria-label="Next page" @click="atPage++">
              <ChevronRightIcon class="w-1.5 h-3" />
            </UiButton>
          </Transition>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-5 mb-8 md:mb-10 lg:gap-6 xl:gap-5 xl:mb-8">
        <SearchItem v-for="item in paginatedProductsList" :key="item._id" :item="item" />
      </div>
      <div class="flex flex-col items-center gap-[25px] md:hidden">
        <div class="flex items-center">
          <UiLabel :for="footerPerPageId" class="text-sm font-normal text-current leading-normal flex-shrink-0 mr-2.5">
            Products on page
          </UiLabel>
          <UiSelect :model-value="String(perPage)" @update:model-value="selectPerPage">
            <UiSelectTrigger :id="footerPerPageId" :class="triggerClass">
              <UiSelectValue>{{ perPage }}</UiSelectValue>
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem v-for="option in perPageOptions" :key="option" :value="String(option)">
                {{ option }}
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>
        </div>
        <div class="flex items-center">
          <Transition name="fade">
            <UiButton v-if="atPage !== 1" variant="ghost" size="icon" class="mr-4" aria-label="Previous page" @click="atPage--">
              <ChevronRightIcon class="w-1.5 h-3 rotate-180" />
            </UiButton>
          </Transition>
          <Pagination
            v-model="atPage"
            :page-count="totalPages"
            :page-range="3"
            :hide-prev-next="true"
            page-link-class="searchProducts--pagination-item"
            prev-link-class="searchProducts--pagination-item_prev cursor-pointer text-mainPurple font-medium px-2"
            next-link-class="searchProducts--pagination-item_next cursor-pointer text-mainPurple font-medium px-2"
            active-class="searchProducts--pagination-item-active"
            class="flex items-center justify-center"
          >
            <template #breakViewContent>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 12 4" class="w-3 h-2 translate-y-1">
                <path
                  fill="#5E6278"
                  d="M1.943 3.11c-.302 0-.56-.107-.776-.319a1.03 1.03 0 0 1-.318-.775 1.019 1.019 0 0 1 .318-.766c.215-.212.474-.318.776-.318.291 0 .545.106.76.318a1.045 1.045 0 0 1 .174 1.317c-.1.166-.232.299-.398.398a1.035 1.035 0 0 1-.536.144Zm4.06 0c-.301 0-.56-.107-.775-.319a1.03 1.03 0 0 1-.319-.775 1.019 1.019 0 0 1 .319-.766c.215-.212.474-.318.775-.318.292 0 .545.106.76.318a1.045 1.045 0 0 1 .175 1.317c-.1.166-.232.299-.398.398a1.035 1.035 0 0 1-.537.144Zm4.06 0c-.301 0-.56-.107-.775-.319a1.03 1.03 0 0 1-.318-.775 1.019 1.019 0 0 1 .318-.766c.216-.212.474-.318.776-.318.291 0 .545.106.76.318a1.045 1.045 0 0 1 .174 1.317c-.1.166-.232.299-.397.398a1.035 1.035 0 0 1-.537.144Z"
                />
              </svg>
            </template>
          </Pagination>
          <Transition name="fade">
            <UiButton v-if="totalPages !== atPage" variant="ghost" size="icon" class="ml-4" aria-label="Next page" @click="atPage++">
              <ChevronRightIcon class="w-1.5 h-3" />
            </UiButton>
          </Transition>
        </div>
      </div>
    </div>
    <div v-else class="container">
      <EmptyState
        v-bind="searchEmptyPreset"
        :description="
          keyword
            ? `We could not find products for “${keyword}”. Try adjusting your keywords or filters to discover products in the Components Marketplace catalog.`
            : searchEmptyPreset.description
        "
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import Pagination from 'vuejs-paginate-next';
import { subHours } from 'date-fns';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import type { SearchData } from '~~/types/product';
import EmptyState from '~/components/global/EmptyState.vue';
import { searchEmptyPreset } from '~/components/global/empty-state-presets';

const props = defineProps<{
  products: SearchData | null;
  keyword: string | '';
}>();

const emits = defineEmits(['at-page', 'per-page', 'sort-by-change', 'show-filter']);

type SortByOption = { label: string; name: string; order: 0 | 1 };

watch(
  () => props.products,
  () => {
    setProductsList();
  },
  { deep: true },
);

const showId = useId();
const sortById = useId();
const perPageId = useId();
const footerPerPageId = useId();
/** Keeps the compact look of the former custom dropdowns on the shared select trigger. */
const triggerClass = 'h-auto w-auto gap-2 rounded px-2.5 py-[3px]';

const show = ref({ name: 'All products', key: {} });
const showOptions = ref([
  {
    name: 'New products only',
    key: { startDate: subHours(new Date(), 24).toISOString() },
  },
  { name: 'Available in stock', key: { stockFrom: 1 } },
  { name: 'Sales only' },
  { name: 'All products', key: {} },
]);

const selectShow = (name: string) => {
  const option = showOptions.value.find((item) => item.name === name);
  if (!option) return;
  show.value.name = option.name;
  if (option.key) emits('show-filter', option.key);
};

const sortBy = ref<SortByOption>({ label: 'Product Code A–Z', name: 'manufacturerCode', order: 1 });

const sortByOptions = ref<SortByOption[]>([
  { label: 'Product Code A–Z', name: 'code', order: 1 },
  { label: 'Product Code Z–A', name: 'code', order: 0 },
  { label: 'Manufacturer A–Z', name: 'manufacturer', order: 1 },
  { label: 'Manufacturer Z–A', name: 'manufacturer', order: 0 },
  { label: 'Description A–Z', name: 'description', order: 1 },
  { label: 'Description Z–A', name: 'description', order: 0 },
  { label: 'Category A–Z', name: 'category', order: 1 },
  { label: 'Category Z–A', name: 'category', order: 0 },
  { label: 'Stock Low–High', name: 'stock', order: 1 },
  { label: 'Stock High–Low', name: 'stock', order: 0 },
  { label: 'Price Low–High', name: 'price', order: 1 },
  { label: 'Price High–Low', name: 'price', order: 0 },
]);

const sortByValue = (option: SortByOption) => `${option.name}-${option.order}`;

const selectSortBy = (value: string) => {
  const option = sortByOptions.value.find((item) => sortByValue(item) === value);
  if (!option) return;
  sortBy.value = option;
  emits('sort-by-change', option);
};

const perPageOptions = [5, 10, 20, 50, 100];

const selectPerPage = (value: string) => {
  perPage.value = Number(value);
  emits('per-page', perPage.value);
};

const atPage = ref(1);
const perPage = ref(10);
const totalItems = ref(props.products?.items.total_items);
const totalPages = ref(props.products?.items.page_count);
const paginatedProductsList = ref(props.products?.items.items);

const setProductsList = () => {
  const paginatedProductsData = props.products;
  const paginatedProducts = paginatedProductsData?.items.items;

  if (!paginatedProducts) {
    return;
  }

  totalItems.value = paginatedProductsData?.items.total_items;
  totalPages.value = paginatedProductsData?.items.page_count;
  paginatedProductsList.value = paginatedProducts;
};

setProductsList();

watch(
  [atPage],
  async ([_atPage]) => {
    emits('at-page', _atPage);
  },
  { deep: true },
);
</script>

<style>
@reference "../../assets/css/main.css";
.searchProducts--pagination-item {
  @apply cursor-pointer flex items-center justify-center w-8 h-8 mx-1 text-sm font-Inter font-semibold rounded-md bg-muted text-muted-foreground transition-colors duration-300 hover:bg-blue-500 hover:text-white focus-visible:bg-blue-500 focus-visible:text-white!;
}

.searchProducts--pagination-item-active .searchProducts--pagination-item {
  @apply bg-blue-500 text-white!;
}

.searchProducts--pagination-item_prev,
.searchProducts--pagination-item_next {
  @apply hidden!;
}
</style>
