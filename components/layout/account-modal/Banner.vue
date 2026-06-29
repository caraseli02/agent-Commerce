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
      <SwiperSlide v-for="item in 9" :key="item">
        <div
          class="max-w-[396px] items-stretch self-stretch shadow-xs flex flex-col justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-[#42239A] via-[#454DBB] to-[#007FFF]"
        >
          <div class="items-stretch flex justify-between gap-4">
            <div class="items-stretch flex grow basis-[0%] flex-col gap-4">
              <div class="flex flex-col gap-1">
                <h4 class="text-white text-sm font-bold leading-5 whitespace-nowrap">Business Solutions</h4>
                <p class="text-white text-xs leading-4 font-normal">Scale your operations with our premium hardware logistics.</p>
              </div>
              <div
                class="w-fit text-blue-500 text-sm font-medium leading-6 whitespace-nowrap justify-center bg-zinc-100 py-1 px-4 rounded-md items-start"
              >
                View More
              </div>
            </div>
            <img
              loading="lazy"
              :src="BannerItem"
              class="aspect-[1.16] object-contain object-center w-[100px] overflow-hidden self-center shrink-0 max-w-full my-auto"
            />
          </div>
        </div>
      </SwiperSlide>
      <SwiperSlide :key="2">
        <div
          class="max-w-[396px] items-stretch self-stretch shadow-xs flex flex-col justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-[#42239A] via-[#454DBB] to-[#007FFF]"
        >
          <div class="items-stretch flex justify-between gap-4">
            <div class="items-stretch flex grow basis-[0%] flex-col gap-4">
              <div class="flex flex-col gap-1">
                <h4 class="text-white text-sm font-bold leading-5 whitespace-nowrap">Global Logistics</h4>
                <p class="text-white text-xs leading-4 font-normal">Reliable worldwide shipping for your industrial components.</p>
              </div>
              <div
                class="w-fit text-blue-500 text-sm font-medium leading-6 whitespace-nowrap justify-center bg-zinc-100 py-1 px-4 rounded-md items-start"
              >
                View More
              </div>
            </div>
            <img
              loading="lazy"
              :src="BannerItem"
              class="aspect-[1.16] object-contain object-center w-[100px] overflow-hidden self-center shrink-0 max-w-full my-auto"
            />
          </div>
        </div>
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<script setup lang="ts">
import { A11y, Pagination } from 'swiper';
import BannerItem from '@/assets/media/home/banner-item.png';
</script>
