<template>
  <div class="container px-2 md:px-4 overflow-hidden mt-10" :class="slots.banner ? 'xl:pl-6' : 'xl:px-4'">
    <slot name="header" />
    <ProductTabs
      v-if="filters?.length"
      :class="{ 'xl:ml-0': slots.banner }"
      :filters="filters"
      :initial-products="fetchedProducts"
      @new-products="onProductsLoaded"
    />
    <div :class="['md:flex flex-col xl:grid', { 'xl:grid-cols-[auto,1fr]': slots.banner }]">
      <slot name="banner" />
      <div v-if="isLoading" class="px-1 mt-6 md:pr-0 min-h-[284px] w-full" aria-busy="true" aria-live="polite">
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="n in 3" :key="n" class="h-[280px] rounded-xl bg-slate-100 animate-pulse" />
        </div>
        <span class="sr-only">Loading products…</span>
      </div>
      <div v-else-if="productList.length === 0" class="px-1 mt-6 md:pr-0 min-h-[284px] w-full">
        <div class="flex flex-col gap-10 items-center content-center justify-center w-full h-full">
          <div>
            <SvgoNotFound class="hidden sm:block" />
            <SvgoNotFoundSmall class="block sm:hidden" />
          </div>
          <div class="flex flex-col justify-center items-center text-gray-500">
            <h4 class="text-xl text-center text-semibold">No Products Found</h4>
            <p>Oops! Seems like there’s nothing here yet.</p>
          </div>
        </div>
      </div>
      <ProductGrid
        v-else
        :masonry-view="masonryView"
        :order-summary-view="orderSummaryView"
        :has-banner="!!slots.banner"
        :products-list="productList"
        :rows-number="rowsNumber"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductInterface } from '~/types/product';

const props = defineProps<{
  filters?: string[];
  masonryView?: boolean;
  orderSummaryView?: boolean;
  fetchedProducts?: ProductInterface[];
  rowsNumber?: number;
}>();

const slots = defineSlots<{
  header?: () => unknown;
  banner?: () => unknown;
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
  }
);
</script>
