<template>
  <div>
    <SearchBreadcrumbs @change-path="changePath" />
    <SearchFilters
      v-if="filters"
      :filters="filters"
      :keyword="keyword"
      :at-page="atPage"
      :per-page="perPage"
      @reset-products-filters="resetProductsFilters = $event"
    />
    <SearchProducts
      v-if="products"
      :products="products"
      :keyword="keyword"
      @at-page="atPage = $event"
      @per-page="perPage = $event"
      @sort-by-change="onSortByChange"
      @show-filter="additionalFilters = $event"
    />
    <div v-else class="container mb-10 min-h-[200px]" aria-busy="true">
      <div class="h-10 w-64 rounded bg-slate-100 animate-pulse mb-6" />
      <div class="space-y-4">
        <div v-for="n in 3" :key="n" class="h-[120px] rounded-2xl bg-slate-100 animate-pulse" />
      </div>
      <span class="sr-only">Loading search results…</span>
    </div>
    <template v-if="showAdditionalContent">
      <ProductBlocks
        :rows-number="2"
        class="mb-7 lg:mb-[38px] xl:mb-[58px]"
        :filters="['Featured', 'Best Sellers', 'Hot Deals', 'Top Searched']"
      />
      <Banner />
      <div class="container mb-[30px] lg:mb-10 xl:mb-[60px]">
        <div class="grid grid-cols-1 gap-[15px] md:grid-cols-[40%,calc(60%-20px)] md:gap-5 xl:grid-cols-[41%,calc(59%-20px)]">
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
import { watch } from 'vue';
import { storeToRefs } from 'pinia';
import type { ProductParametricDataFeaturesInterface } from '~/model/products/response/ProductResponse';
import type { ProductFilters, SearchData } from '~/model/products/response/ProductSearchResponse';
import { fetchSearchProduct } from '~/composables/api/products';
import { useProductStore } from '~/store/productStore';

useHead({
  title: 'Search',
});

const productStore = useProductStore();
const { similarProducts, similarProductFeatures, showSimilarOnly } = storeToRefs(productStore);
const route = useRoute();
const keyword = ref((route.query.keyword ?? route.query.q)?.toString() ?? '');

const resolveKeyword = () => keyword.value;

const products = ref<SearchData | null>(null);
const filters = ref<ProductFilters | null>(null);
const additionalFilters = ref({});
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

onMounted(async () => {
  watch(
    [similarProducts, similarProductFeatures],
    async (newValues) => {
      if (newValues[0] && newValues[1]) {
        await getProduct(
          resolveKeyword(),
          atPage.value,
          perPage.value,
          {
            sortBy: sortBy.value.name,
            sortOrder: order.value === 0 ? 'desc' : 'asc',
          },
          additionalFilters.value,
          newValues[1]
        );
        showSimilarOnly.value = false;
      }
    },
    { deep: true }
  );

  if (!products.value && !showSimilarOnly.value) {
    await getProduct(
      resolveKeyword(),
      atPage.value,
      perPage.value,
      {
        sortBy: sortBy.value.name,
        sortOrder: order.value === 0 ? 'desc' : 'asc',
      },
      additionalFilters.value,
      []
    );
  }
});

async function getProduct(
  keyword: string,
  atPage: number,
  perPage: number,
  sort = {},
  additionalFilters = {},
  filter: ProductParametricDataFeaturesInterface[] = [],
  ignoreCategory = false
) {
  const { data } = await fetchSearchProduct(
    keyword,
    ignoreCategory ? null : category.value,
    atPage,
    perPage,
    sort,
    additionalFilters,
    filter
  );

  products.value = data;
  filters.value = data.filters;
}

async function changePath() {
  const { data } = await fetchSearchProduct(
    resolveKeyword(),
    route.query.category?.toString() ?? null,
    atPage.value,
    perPage.value,
    {
      sortBy: sortBy.value.name,
      sortOrder: order.value === 0 ? 'desc' : 'asc',
    },
    additionalFilters.value
  );

  products.value = data;
  filters.value = data.filters;
}

const handleSortChange = async () => {
  await getProduct(
    resolveKeyword(),
    atPage.value,
    perPage.value,
    {
      sortBy: sortBy.value.name,
      sortOrder: order.value === 0 ? 'desc' : 'asc',
    },
    additionalFilters.value
  );
};

watch([sortBy, order], async () => {
  await handleSortChange();
});

watch(
  [atPage, perPage],
  async ([_atPage, _perPage]) => {
    await getProduct(
      resolveKeyword(),
      _atPage,
      _perPage,
      {
        sortBy: sortBy.value.name,
        sortOrder: order.value === 0 ? 'desc' : 'asc',
      },
      additionalFilters.value
    );
  },
  { deep: true }
);

watch(additionalFilters, async (filter) => {
  await getProduct(
    resolveKeyword(),
    atPage.value,
    perPage.value,
    {
      sortBy: sortBy.value.name,
      sortOrder: order.value === 0 ? 'desc' : 'asc',
    },
    filter
  );
});

watch(route, (value) => {
  const newKeyword = (value.query.keyword ?? value.query.q)?.toString() ?? '';
  keyword.value = newKeyword;
  getProduct(newKeyword, 1, 10, {}, additionalFilters.value);
});

Emitter.on('register-filter-option', async (filter: ProductParametricDataFeaturesInterface[]) => {
  await getProduct(
    resolveKeyword(),
    1,
    perPage.value,
    {
      sortBy: sortBy.value.name,
      sortOrder: order.value === 0 ? 'desc' : 'asc',
    },
    additionalFilters.value,
    filter
  );
});

Emitter.on('reset-products-filters', async (value: boolean) => {
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

  await getProduct(resolveKeyword(), atPage.value, perPage.value, {
    sortBy: sortBy.value.name,
    sortOrder: order.value === 0 ? 'desc' : 'asc',
  });
});

Emitter.on('product-keyword-change', async (value: { keyword: string; products: SearchData }) => {
  keyword.value = value.keyword;
  await getProduct(value.keyword, atPage.value, perPage.value, {}, additionalFilters.value, [], true);
});
</script>
