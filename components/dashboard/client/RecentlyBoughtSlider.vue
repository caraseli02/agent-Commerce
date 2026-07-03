<template>
  <div class="w-full justify-center items-stretch shadow-xs bg-white flex gap-6 lg:hidden flex-col px-6 py-5 rounded-xl max-md:px-5">
    <section class="flex">
      <p class="header text-zinc-800 text-base font-semibold leading-6 grow shrink basis-auto">Recently Bought</p>
      <div class="items-stretch flex gap-2 self-start">
        <NuxtLink to="/dashboard/client?tab=orders" class="text-slate-500 text-sm font-medium leading-5 grow whitespace-nowrap">
          View Orders
        </NuxtLink>
        <SvgoArrowLeft16
          class="aspect-square object-contain object-center w-4 justify-center items-center shrink-0 my-auto text-slate-500"
        />
      </div>
    </section>
    <div class="items-stretch justify-between gap-5 max-w-[326px] md:max-w-[688px]">
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
            slidesPerView: 2,
          },
        }"
        class="homeFeaturedProducts--swiper w-[100%] h-[100%] block"
      >
        <SwiperSlide v-for="(item, index) in data" :key="index">
          <div class="max-w-[320px] overflow-hidden flex gap-3">
            <div
              class="justify-center items-center border-neutral-300 flex flex-col w-[60px] h-[60px] md:w-[80px] md:h-[80px] rounded-lg border-2 border-solid"
            >
              <svgo-card-placeholder-small class="w-8 h-8" />
              <NuxtImg v-if="item.photo" :src="item.photo" loading="lazy" />
            </div>
            <div class="items-stretch flex flex-col whitespace-nowrap flex-1 self-start max-w-[240px] overflow-hidden">
              <div class="text-neutral-800 text-sm font-semibold leading-4 text-ellipsis overflow-hidden">
                {{ item.title }}
              </div>
              <div class="text-slate-500 text-ellipsis text-xs leading-4 mt-2 overflow-hidden">
                {{ item.subtitle }}
              </div>
            </div>
          </div>
        </SwiperSlide>
      </Swiper>
    </div>
  </div>
</template>

<script setup lang="ts">
import { A11y, Pagination } from 'swiper';

const data = [
  {
    photo: '',
    title: 'RSCSK3343R3D02008T',
    subtitle: 'Diode: rectifying; SMD; 100V; 0.15A; 4ns; SOD323; Ufmax: 1.2V; 200mW',
  },
  {
    photo: '',
    title: 'MCP9808T-E/OT',
    subtitle: 'Temperature sensor, I2C, ±0.25°C typical accuracy, SOT-23-5',
  },
  {
    photo: '',
    title: 'CL31A226KAHNNNE',
    subtitle: 'MLCC capacitor, 22µF, 10V, X5R, 1206 package',
  },
  {
    photo: '',
    title: 'USB-CTP-16P',
    subtitle: 'USB-C receptacle, 16-pin, right-angle, board mount',
  },
  {
    photo: '',
    title: 'STM32F411RET6',
    subtitle: '32-bit microcontroller, ARM Cortex-M4, 512 KB flash',
  },
];
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
  @apply w-1.5 h-1.5 bg-light-500 rounded-full opacity-100 m-0 transition-all duration-300 md:w-1.5 md:h-1.5 #{!important};
  margin-right: 0 !important;
}

.homeFeaturedProducts--swiper .swiper-pagination-bullet.swiper-pagination-bullet-active {
  @apply scale-125 bg-gray-300 #{!important};
}
</style>
