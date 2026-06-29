<template>
  <div class="relative overflow-x-hidden rounded-2xl border border-slate-200 aspect-[1.24] md:aspect-auto shadow-sm">
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
      class="orderSummaryExclusiveOffer--swiper w-full h-full"
    >
      <SwiperSlide v-for="(item, index) in slides" :key="index">
        <div
          class="relative z-20 flex h-full flex-col justify-end px-5 pt-8 pb-14 text-white md:pt-8 md:pr-10 md:pb-14 lg:pt-[150px] lg:pr-6 lg:pb-12 xl:px-8"
        >
          <h3 class="font-semibold mb-2 md:text-2xl md:mb-3 lg:text-xl lg:text-center">
            {{ item.title }}
          </h3>
          <p class="text-xs leading-5 mb-6 md:text-sm md:max-w-[420px] md:mb-5 lg:max-w-[434px] lg:mb-6 lg:text-center">
            {{ item.description }}
          </p>
          <button
            class="flex bg-blue-500 rounded-lg px-4 py-2 text-[13px] font-medium md:px-6 md:py-2.5 md:text-sm lg:mb-0 lg:mx-auto shadow-sm"
          >
            Buy Now
          </button>
          <NuxtImg
            :src="item.item"
            alt="Img"
            class="absolute bottom-8 left-1/2 -translate-x-1/2 w-[205px] object-contain md:w-[200px] md:left-[unset] md:translate-x-0 md:right-10 lg:w-[165px] lg:right-1/2 lg:translate-x-1/2 lg:top-5" loading="lazy"/>
        </div>
        <NuxtImg :src="item.bg" alt="Background" class="absolute top-0 left-0 w-full h-full object-cover rounded-md" loading="lazy"/>
        <div
          class="absolute z-10 top-0 left-0 w-full h-full opacity-75 rounded-md pointer-events-none"
          :style="{
            background: 'linear-gradient(358.21deg, #001238 -7.93%, rgba(0, 127, 255, 0.85) 92.6%)',
          }"
        />
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<script setup lang="ts">
import { A11y, Autoplay, Pagination } from 'swiper';
import SlideBg from '@/assets/media/home/exclusive-offer-bg.jpg';
import ItemImage from '@/assets/media/home/exclusive-offer-item.png';

const slides = ref([
  {
    title: 'Built for modern B2B procurement',
    description: 'Compare parts, confirm availability, and move from shortlist to checkout with a cleaner reviewer-friendly flow.',
    bg: SlideBg,
    item: ItemImage,
  },
  {
    title: 'Shortlist faster with buyer-ready detail',
    description:
      'Keep pricing tiers, stock, and shipping decisions in one view so reviewers can understand the procurement flow immediately.',
    bg: SlideBg,
    item: ItemImage,
  },
  {
    title: 'Checkout flow built for operational clarity',
    description: 'Reduce friction between cart review, account access, and order confirmation with clearer spacing and next-step cues.',
    bg: SlideBg,
    item: ItemImage,
  },
  {
    title: 'Reliable ordering without retail noise',
    description: 'Present promotions as procurement support, not consumer hype, so the page stays credible during portfolio review.',
    bg: SlideBg,
    item: ItemImage,
  },
]);
</script>

<style lang="scss">
.orderSummaryExclusiveOffer--swiper .swiper-pagination {
  @apply bottom-[15px] space-x-1.5 md:space-x-2 lg:left-1/2 lg:-translate-x-1/2 #{!important};
}
.orderSummaryExclusiveOffer--swiper .swiper-pagination-bullet {
  @apply w-1.5 h-1.5 bg-gray-500 rounded-full opacity-100 m-0 transition-all duration-300 md:w-2 md:h-2 #{!important};
  margin-right: 0 !important;
}
.orderSummaryExclusiveOffer--swiper .swiper-pagination-bullet.swiper-pagination-bullet-active {
  @apply w-[25px] bg-white #{!important};
}
</style>
