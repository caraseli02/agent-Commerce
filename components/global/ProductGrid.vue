<template>
  <Swiper
    :modules="[A11y, Pagination]"
    :slides-per-view="1"
    :space-between="15"
    :grab-cursor="true"
    :pagination="{
      bulletElement: 'button',
      clickable: true,
    }"
    class="homeFeaturedProducts--swiper w-[100%] block"
  >
    <SwiperSlide v-for="(item, index) in productsByViewport" :key="index">
      <div class="grid items-stretch gap-6 mt-6" :class="[computedCols, hasBanner ? 'px-2 md:px-3' : 'px-2']">
        <template v-if="Array.isArray(item)">
          <ProductCard
            v-for="(product, productIndex) in item"
            :key="productIndex"
            :product="product"
            :class="[cardClass, { 'md:first:col-span-2': masonryView }]"
          />
        </template>
        <ProductCard v-else :product="item" />
      </div>
    </SwiperSlide>
  </Swiper>
</template>

<script setup lang="ts">
import { A11y, Pagination } from 'swiper';
import type { ProductInterface } from '~/types/product';

const props = defineProps<{
  productsList: ProductInterface[];
  cardClass?: string;
  masonryView?: boolean;
  hasBanner?: boolean;
  orderSummaryView?: boolean;
  rowsNumber?: number;
}>();

const computedCols = computed(() => {
  if (props.hasBanner) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  if (props.orderSummaryView) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4';
});

function createChunkedArray(chunkSize: number, productList: ProductInterface[]) {
  const chunkedArray = [];
  for (let i = 0; i < productList.length; i += chunkSize) {
    chunkedArray.push(productList.slice(i, i + chunkSize));
  }
  return chunkedArray;
}
const viewport = useViewport();
const productsByViewport = computed(() => {
  const rowsNumber = props.rowsNumber ?? 1;
  const breakpointsMasonryBanner = {
    xs: props.productsList,
    sm: createChunkedArray(3, props.productsList),
    md: createChunkedArray(3, props.productsList),
    lg: createChunkedArray(5, props.productsList),
    xl: createChunkedArray(5, props.productsList),
    '2xl': createChunkedArray(5, props.productsList),
  };

  const breakpointsMasonry = { ...breakpointsMasonryBanner, '2xl': createChunkedArray(7, props.productsList) };

  const breakpoints = {
    xs: props.productsList,
    sm: createChunkedArray(2 * rowsNumber, props.productsList),
    md: createChunkedArray(2 * rowsNumber, props.productsList),
    lg: createChunkedArray(3 * rowsNumber, props.productsList),
    xl: createChunkedArray(3 * rowsNumber, props.productsList),
    '2xl': createChunkedArray(4 * rowsNumber, props.productsList),
  };

  const breakpointsOrderSummary = {
    ...breakpoints,
    '2xl': createChunkedArray(3, props.productsList),
  };

  if (props.hasBanner && props.masonryView) {
    return breakpointsMasonryBanner[viewport.breakpoint.value as keyof typeof breakpoints] || [];
  }
  if (props.masonryView) {
    return breakpointsMasonry[viewport.breakpoint.value as keyof typeof breakpoints] || [];
  }
  if (props.orderSummaryView) {
    return breakpointsOrderSummary[viewport.breakpoint.value as keyof typeof breakpoints] || [];
  }
  return breakpoints[viewport.breakpoint.value as keyof typeof breakpoints] || [];
});
</script>

<style lang="scss">
.homeFeaturedProducts--swiper {
  @apply px-0 pt-0 pb-[30px] #{!important};
}

.homeFeaturedProducts--swiper .swiper-slide {
  @apply h-auto #{!important};
}

.homeFeaturedProducts--swiper .swiper-pagination {
  @apply bottom-0 space-x-1.5 md:space-x-2 #{!important};
}

.homeFeaturedProducts--swiper .swiper-pagination-bullet {
  @apply w-1.5 h-1.5 bg-light-500 rounded-full opacity-100 m-0 transition-all duration-300 md:w-2 md:h-2 #{!important};
  margin-right: 0 !important;
}

.homeFeaturedProducts--swiper .swiper-pagination-bullet.swiper-pagination-bullet-active {
  @apply scale-125 bg-gray-300 #{!important};
}
</style>
