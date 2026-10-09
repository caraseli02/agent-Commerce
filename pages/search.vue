<template>
  <div>
    <SearchBreadcrumbs />
    <SearchFilters
      v-if="filters"
      :filters="filters"
      :keyword="keyword"
      :at-page="atPage"
      :per-page="perPage"
      @reset-products-filters="resetProductsFilters = $event"
    />
    <div v-if="pending" class="container mb-10 min-h-[200px]" aria-busy="true" aria-live="polite">
      <div class="h-10 w-64 rounded bg-slate-100 animate-pulse motion-reduce:animate-none mb-6" />
      <div class="space-y-4">
        <div v-for="n in 3" :key="n" class="h-[120px] rounded-2xl bg-slate-100 animate-pulse motion-reduce:animate-none" />
      </div>
      <span class="sr-only">Loading search results…</span>
    </div>

    <div v-else-if="error" class="container mb-10 min-h-[200px] flex flex-col items-start justify-center gap-4" role="alert">
      <p class="text-lg font-semibold text-slate-900">We could not load search results</p>
      <p class="text-sm text-slate-600 max-w-xl">Try again or adjust your filters.</p>
      <UiButton type="button" @click="refresh()">Try again</UiButton>
    </div>

    <SearchProducts
      v-else-if="products"
      :key="searchResultsKey"
      :products="products"
      :keyword="keyword"
      @at-page="atPage = $event"
      @per-page="perPage = $event"
      @sort-by-change="onSortByChange"
      @show-filter="additionalFilters = $event"
    />

    <template v-if="showAdditionalContent">
      <ProductBlocks
        :rows-number="2"
        class="mb-7 lg:mb-[38px] xl:mb-[58px]"
        :filters="['Featured', 'Best Sellers', 'Hot Deals', 'Top Searched']"
      />
      <Banner />
      <div class="container mb-[30px] lg:mb-10 xl:mb-[60px]">
        <div class="grid grid-cols-1 gap-[15px] md:grid-cols-[40%_calc(60%-20px)] md:gap-5 xl:grid-cols-[41%_calc(59%-20px)]">
          <QuickBuy />
          <EcxlusiveOffer />
        </div>
      </div>
      <NewProducts :row-count="2" />
      <News />
      <Manufacturers />
    </template>
  </div>
</template>

<script setup lang="ts">
import Emitter from 'tiny-emitter/instance.js';
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import type { ProductFilters, ProductParametricDataFeaturesInterface, SearchData } from '~/types/product';
import { consumeSimilarSearchTransfer } from '~/composables/consumeSimilarSearchTransfer';
import { loadSearchResults, searchResultsCacheKey } from '~/composables/loadSearchResults';
import { useProductStore } from '~/store/productStore';

usePageSeo({
  title: 'Search Electronic Components',
  description: 'Search electronic components by part number, manufacturer, or keyword, then filter by specifications and stock.',
});

const productStore = useProductStore();
const { similarProducts, similarProductFeatures } = storeToRefs(productStore);
const route = useRoute();
const keyword = ref((route.query.keyword ?? route.query.q)?.toString() ?? '');

const additionalFilters = ref<Record<string, unknown>>({});
const featureFilters = ref<ProductParametricDataFeaturesInterface[]>([]);
const ignoreCategory = ref(false);
const atPage = ref(1);
const perPage = ref(10);
const sortBy = ref({ label: 'Product Code A–Z', name: 'manufacturerCode', order: 1 as 0 | 1 });
const order = ref<1 | 0>(1);

const onSortByChange = (option: { label: string; name: string; order?: 0 | 1 }) => {
  sortBy.value = { ...option, order: option.order ?? order.value };
  if (option.order !== undefined) {
    order.value = option.order;
  }
};
const resetProductsFilters = ref(false);
const category = ref<string | null>(route.query?.category?.toString() || null);
const showAdditionalContent = computed(() => {
  const isBrowsingCatalog = !keyword.value.trim() && !category.value;
  return isBrowsingCatalog && (products.value?.items?.total_items ?? 0) > 0;
});
// Remount SearchProducts when the search context changes so its internal pager cannot stay stale.
const searchResultsKey = computed(() => `${keyword.value}::${category.value ?? ''}`);

const searchQuery = computed(() => ({
  keyword: keyword.value,
  category: ignoreCategory.value ? null : category.value,
  page: atPage.value,
  perPage: perPage.value,
  sortBy: sortBy.value.name,
  sortOrder: (order.value === 0 ? 'desc' : 'asc') as 'asc' | 'desc',
  additionalFilters: additionalFilters.value,
  featureFilters: featureFilters.value,
}));

const {
  data: searchData,
  pending,
  error,
  refresh,
} = await useAsyncData<SearchData>(
  () => searchResultsCacheKey(searchQuery.value),
  () => loadSearchResults(searchQuery.value),
  {
    // Search initialization explicitly refreshes after transferred similar-product
    // filters are applied, so the handler only ever returns real search data.
    immediate: false,
    watch: [keyword, category, atPage, perPage, sortBy, order, additionalFilters, featureFilters, ignoreCategory],
  },
);

const products = computed(() => searchData.value ?? null);
const filters = ref<ProductFilters | null>(null);

watch(
  searchData,
  (data) => {
    if (data?.filters) {
      filters.value = data.filters;
    }
  },
  { immediate: true, flush: 'sync' },
);

const initializeSearchFromRoute = () => {
  featureFilters.value = consumeSimilarSearchTransfer(route.query.similar === 'true', similarProducts.value, similarProductFeatures.value);
  similarProducts.value = null;
  similarProductFeatures.value = null;
};

initializeSearchFromRoute();
await refresh();

// Both `keyword` and `category` live in the URL, so breadcrumb and menu navigation must refresh both.
// Reset pager state and remount SearchProducts (via searchResultsKey) so UI controls match fetched data.
watch(route, (value) => {
  const newKeyword = (value.query.keyword ?? value.query.q)?.toString() ?? '';
  keyword.value = newKeyword;
  category.value = value.query.category?.toString() || null;
  ignoreCategory.value = false;
  atPage.value = 1;
  perPage.value = 10;
  initializeSearchFromRoute();
});

Emitter.on('register-filter-option', (filter: ProductParametricDataFeaturesInterface[]) => {
  featureFilters.value = filter;
  atPage.value = 1;
});

Emitter.on('reset-products-filters', (value: boolean) => {
  if (!value) {
    return;
  }

  const obj = _cloneDeep(filters.value);
  if (!obj) {
    return;
  }
  const keys = Object.keys(obj);

  for (const key of keys) {
    for (const filter of obj[key]) {
      filter.checked = false;
    }
  }

  filters.value = obj;
  additionalFilters.value = {};
  featureFilters.value = [];
  atPage.value = 1;
});

Emitter.on('product-keyword-change', (value: { keyword: string; products: SearchData }) => {
  keyword.value = value.keyword;
  ignoreCategory.value = true;
  atPage.value = 1;
});
</script>
