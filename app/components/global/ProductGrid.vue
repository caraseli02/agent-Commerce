<template>
  <Swiper
    :modules="[A11y, Pagination]"
    :slides-per-view="1"
    :space-between="15"
    :grab-cursor="true"
    :pagination="
      {
        bulletElement: 'button',
        clickable: true,
      } as any
    "
    :class="['homeFeaturedProducts--swiper block w-[100%]', { '-mx-1': flush }]"
  >
    <SwiperSlide v-for="(item, index) in productsByViewport" :key="index">
      <div :class="['grid items-stretch', flush ? 'gap-4 p-1 md:gap-6' : 'mt-6 gap-6 px-2', computedCols]">
        <ProductCard v-for="(product, productIndex) in item" :key="productIndex" :product="product" :class="cardClass" />
      </div>
    </SwiperSlide>
  </Swiper>
</template>

<script setup lang="ts">
import { A11y, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/vue';
import type { ProductInterface } from '~~/types/product';

const props = defineProps<{
  productsList: ProductInterface[];
  cardClass?: string;
  orderSummaryView?: boolean;
  rowsNumber?: number;
  /** Drop the inner gutters so cards line up with the container edge. */
  flush?: boolean;
}>();

const computedCols = computed(() => {
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
// The server cannot know the first visitor's viewport. Keep the initial client
// render on the configured SSR fallback, then apply the measured breakpoint
// after hydration so the slide structure is never different during hydration.
const renderedBreakpoint = ref('lg');
onMounted(() => {
  renderedBreakpoint.value = viewport.breakpoint.value;
  watch(viewport.breakpoint, (breakpoint) => {
    renderedBreakpoint.value = breakpoint;
  });
});

const productsByViewport = computed(() => {
  const rowsNumber = props.rowsNumber ?? 1;
  // Single-column phones use the SSR fallback's ('lg') slide size, so a mobile
  // visitor sees a short stacked list and the slides do not re-chunk on hydration.
  const breakpoints = {
    xs: createChunkedArray(3 * rowsNumber, props.productsList),
    sm: createChunkedArray(3 * rowsNumber, props.productsList),
    md: createChunkedArray(2 * rowsNumber, props.productsList),
    lg: createChunkedArray(3 * rowsNumber, props.productsList),
    xl: createChunkedArray(3 * rowsNumber, props.productsList),
    '2xl': createChunkedArray(4 * rowsNumber, props.productsList),
  };

  const breakpointsOrderSummary = {
    ...breakpoints,
    '2xl': createChunkedArray(3, props.productsList),
  };

  if (props.orderSummaryView) {
    return breakpointsOrderSummary[renderedBreakpoint.value as keyof typeof breakpoints] || [];
  }
  return breakpoints[renderedBreakpoint.value as keyof typeof breakpoints] || [];
});
</script>

<style>
@reference "../../assets/css/main.css";
.homeFeaturedProducts--swiper {
  @apply px-0 pt-0 pb-10!;
}

.homeFeaturedProducts--swiper .swiper-slide {
  @apply h-auto!;
}

.homeFeaturedProducts--swiper .swiper-pagination {
  @apply bottom-0 flex justify-center gap-1;
}

/* Each bullet is a 24px button (WCAG 2.5.8 target size) drawing a smaller visible dot. */
.homeFeaturedProducts--swiper .swiper-pagination-bullet {
  @apply relative m-0! h-6 w-6 rounded-full bg-transparent opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring;
}

.homeFeaturedProducts--swiper .swiper-pagination-bullet::before {
  @apply absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-input transition-colors duration-200 content-[''] motion-reduce:transition-none;
}

.homeFeaturedProducts--swiper .swiper-pagination-bullet-active::before {
  @apply w-5 bg-primary;
}
</style>
