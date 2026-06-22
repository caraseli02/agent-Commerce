<template>
  <div class="container px-2 md:px-4 overflow-hidden mt-10" :class="slots.banner ? 'xl:pl-6' : 'xl:px-4'">
    <slot name="header" />
    <ProductTabs
      v-if="!fetchedProducts"
      :class="{ 'xl:ml-0': slots.banner }"
      :filters="filters ?? []"
      @new-products="productList = $event"
    />
    <div :class="['md:flex flex-col xl:grid', { 'xl:grid-cols-[auto,1fr]': slots.banner }]">
      <slot name="banner" />
      <div v-if="productList.length === 0" class="px-1 mt-6 md:pr-0 min-h-[284px] w-full">
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
import type { ProductInterface } from '~/model/products/response/ProductResponse';

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

const productList = ref<ProductInterface[]>([]);

onMounted(() => {
  if (props.fetchedProducts) {
    productList.value = props.fetchedProducts;
  }
});

watch(
  () => props.fetchedProducts,
  (newVal) => {
    if (newVal && newVal?.length > 0) {
      productList.value = props.fetchedProducts as ProductInterface[];
    }
  }
);
</script>
