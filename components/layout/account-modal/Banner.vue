<template>
  <div>
    <Swiper
      :modules="[A11y, Pagination]"
      :slides-per-view="1"
      :space-between="15"
      :grab-cursor="true"
      :pagination="{
        bulletElement: 'button',
        clickable: true,
      }"
      :breakpoints="{
        768: {
          spaceBetween: 20,
        },
      }"
      class="homeNews--swiper"
    >
      <SwiperSlide v-for="slide in slides" :key="slide.title">
        <div
          class="max-w-[396px] items-stretch self-stretch shadow-xs flex flex-col justify-center px-4 py-3 rounded-xl border border-slate-200 bg-slate-50"
        >
          <div class="items-stretch flex justify-between gap-4">
            <div class="items-stretch flex grow basis-[0%] flex-col gap-4">
              <div class="flex flex-col gap-1">
                <h4 class="text-slate-900 text-sm font-bold leading-5">{{ slide.title }}</h4>
                <p class="text-slate-600 text-xs leading-4 font-normal">{{ slide.description }}</p>
              </div>
              <NuxtLink
                :to="slide.to"
                class="w-fit text-slate-800 text-sm font-medium leading-6 justify-center bg-white border border-slate-200 py-1 px-4 rounded-md items-start hover:border-slate-300"
              >
                {{ slide.cta }}
              </NuxtLink>
            </div>
            <img
              loading="lazy"
              :src="BannerItem"
              class="aspect-[1.16] object-contain object-center w-[100px] overflow-hidden self-center shrink-0 max-w-full my-auto"
              alt=""
            />
          </div>
        </div>
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<script setup lang="ts">
import { A11y, Pagination } from 'swiper/modules';
import BannerItem from '@/assets/media/home/banner-item.png';

const slides = [
  {
    title: 'Business account tools',
    description: 'Track orders, credit limits, and shipping defaults from one signed-in workspace.',
    cta: 'Open dashboard',
    to: '/dashboard/client?tab=home',
  },
  {
    title: 'BOM-friendly checkout',
    description: 'Move from shortlist to order summary with tiered pricing visible at every step.',
    cta: 'Browse parts',
    to: '/search',
  },
];
</script>
