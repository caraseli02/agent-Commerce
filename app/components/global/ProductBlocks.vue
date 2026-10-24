<template>
  <div :class="['container', tabsInHeader ? '' : 'px-2 md:px-4 overflow-hidden mt-10 xl:px-4']">
    <!-- Section header with the filter tabs on the same row; the header slot owns the h2. -->
    <div v-if="tabsInHeader" class="mb-5 flex flex-col gap-4 md:mb-6 md:flex-row md:items-end md:justify-between md:gap-8">
      <slot name="header" />
      <ProductTabs
        v-if="filters?.length"
        :show-heading="false"
        :filters="filters"
        :initial-products="fetchedProducts"
        @new-products="onProductsLoaded"
      />
    </div>
    <slot v-else name="header" />
    <div :class="['flex flex-col', { 'xl:grid': !tabsInHeader }]">
      <ProductTabs
        v-if="filters?.length && !tabsInHeader"
        class="order-1"
        :filters="filters"
        :initial-products="fetchedProducts"
        @new-products="onProductsLoaded"
      />
      <div
        v-if="isLoading"
        :class="['order-3 mt-6 min-h-[284px] w-full', tabsInHeader ? '' : 'px-1 md:pr-0']"
        aria-busy="true"
        aria-live="polite"
      >
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="n in 3" :key="n" class="h-[280px] animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        </div>
        <span class="sr-only">Loading products…</span>
      </div>
      <div v-else-if="productList.length === 0" :class="['order-3 mt-6 min-h-[284px] w-full', tabsInHeader ? '' : 'px-1 md:pr-0']">
        <div class="flex flex-col gap-10 items-center content-center justify-center w-full h-full">
          <div>
            <SvgoNotFound class="hidden sm:block" />
            <SvgoNotFoundSmall class="block sm:hidden" />
          </div>
          <div class="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <h3 class="text-xl font-semibold text-foreground">No products found</h3>
            <p class="max-w-[48ch]">Clear a filter or search by manufacturer part number, for example STM32F407VGT6.</p>
            <NuxtLink to="/search" class="min-h-11 content-center font-medium text-primary underline-offset-4 hover:underline">
              Browse the full catalog
            </NuxtLink>
          </div>
        </div>
      </div>
      <ProductGrid
        v-else
        :order-summary-view="orderSummaryView"
        :flush="tabsInHeader"
        :products-list="productList"
        :rows-number="rowsNumber"
        class="order-3"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductInterface } from '~~/types/product';

const props = defineProps<{
  filters?: string[];
  orderSummaryView?: boolean;
  fetchedProducts?: ProductInterface[];
  rowsNumber?: number;
  /** Render the header slot and the filter tabs on one row, aligned to the container edge. */
  tabsInHeader?: boolean;
}>();

defineSlots<{
  header?: () => unknown;
}>();

const productList = ref<ProductInterface[]>(props.fetchedProducts ?? []);
const isLoading = ref(!props.fetchedProducts);

const onProductsLoaded = (products: ProductInterface[]) => {
  productList.value = products;
  isLoading.value = false;
};

onMounted(() => {
  if (props.fetchedProducts) {
    productList.value = props.fetchedProducts;
    isLoading.value = false;
  }
});

watch(
  () => props.fetchedProducts,
  (newVal) => {
    if (newVal) {
      productList.value = newVal;
      isLoading.value = false;
    }
  },
);
</script>
