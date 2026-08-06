<template>
  <div class="relative min-h-[340px] overflow-x-hidden rounded-md md:aspect-auto md:min-h-0">
    <Swiper
      :modules="[A11y, Pagination, Autoplay]"
      :autoplay="{
        delay: 5000,
      }"
      :slides-per-view="1"
      :space-between="15"
      :grab-cursor="true"
      :pagination="{
        bulletElement: 'button',
        clickable: true,
      }"
      class="homeExclusiveOffer--swiper w-full h-full"
    >
      <SwiperSlide v-for="(item, index) in slides" :key="index">
        <div
          class="relative z-20 h-full px-[15px] pb-[145px] pt-[25px] text-white md:pb-[15px] md:pt-5 lg:px-5 lg:py-[30px] xl:px-[30px] xl:pt-[35px]"
        >
          <h3 class="mb-[5px] font-semibold md:mb-2.5 md:text-2xl lg:mb-[5px] lg:max-w-[350px] xl:mb-[15px] xl:text-[32px]">
            {{ item.title }}
          </h3>
          <p class="text-[11px] mb-[26px] md:text-base md:mb-12 lg:max-w-[434px] lg:mb-[30px] xl:text-lg xl:max-w-[350px] xl:mb-[61px]">
            {{ item.description }}
          </p>
          <button class="flex bg-blue-600 rounded px-3 py-1.5 text-[13px] font-medium md:px-6 md:py-2 md:text-sm xl:py-[9px]">
            View More
          </button>
          <ImageWithFallback
            :src="item.item"
            alt="Promotional product"
            class-name="absolute bottom-7 right-4 z-20 w-[170px] object-contain md:left-[unset] md:right-[30px] md:w-[188px] md:translate-x-0 lg:right-5 lg:w-[185px] xl:right-[15px] xl:bottom-[75px] xl:w-[300px]"
          />
        </div>
        <ImageWithFallback :src="item.bg" alt="" class-name="absolute top-0 left-0 h-full w-full rounded-md object-cover" />
        <div class="absolute z-10 top-0 left-0 w-full h-full opacity-90 rounded-md pointer-events-none bg-slate-900" />
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<script setup lang="ts">
import { A11y, Autoplay, Pagination } from 'swiper';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import SlideBg from '@/assets/media/home/exclusive-offer-bg.webp';
import ItemImage from '@/assets/media/home/exclusive-offer-item.png';

const slides = ref([
  {
    title: 'Built for modern B2B procurement',
    description: 'Compare parts, confirm availability, and move from shortlist to checkout with a cleaner reviewer-friendly flow.',
    bg: SlideBg,
    item: ItemImage,
  },
  {
    title: 'Volume pricing, real-time stock',
    description: 'Access tiered pricing and live inventory data across thousands of electronic components from leading manufacturers.',
    bg: SlideBg,
    item: ItemImage,
  },
]);
</script>

<style lang="scss">
.homeExclusiveOffer--swiper .swiper-pagination {
  @apply bottom-[15px] space-x-1.5 md:space-x-2 lg:-translate-x-24 xl:translate-x-0 #{!important};
}
.homeExclusiveOffer--swiper .swiper-pagination-bullet {
  @apply w-1.5 h-1.5 bg-gray-500 rounded-full opacity-100 m-0 transition-all duration-300 md:w-2 md:h-2 #{!important};
  margin-right: 0 !important;
}
.homeExclusiveOffer--swiper .swiper-pagination-bullet.swiper-pagination-bullet-active {
  @apply scale-125 bg-white #{!important};
}
</style>
