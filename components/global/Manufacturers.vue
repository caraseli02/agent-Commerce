<template>
  <section class="mb-10 xl:mb-[70px]">
    <div class="container">
      <h2 class="text-xl font-semibold mb-5">Top Manufacturers</h2>
      <div class="mb-3 grid grid-cols-2 gap-3 md:hidden">
        <div
          v-for="(logo, index) in logos"
          :key="index"
          class="flex min-h-[64px] items-center justify-center rounded-md border border-slate-200 bg-white px-4"
        >
          <ImageWithFallback :src="logo" alt="Manufacturer logo" class-name="max-h-8 max-w-full object-contain" />
        </div>
      </div>
      <Swiper
        :modules="[A11y, Autoplay]"
        :autoplay="{
          delay: 5000,
        }"
        slides-per-view="auto"
        :space-between="10"
        :grab-cursor="true"
        :breakpoints="{
          768: {
            spaceBetween: 18,
          },
          1024: {
            spaceBetween: 22,
            autoplay: false,
          },
          1280: {
            spaceBetween: 24,
          },
        }"
        class="homeManufacturers--swiper swiper-visible mb-2.5 hidden md:block lg:px-[14px] xl:px-9 xl:mb-[15px]"
      >
        <SwiperSlide v-for="(logo, index) in logos" :key="index" class="max-w-max md:max-w-max">
          <ImageWithFallback
            :src="logo"
            alt="Manufacturer logo"
            class-name="h-6 object-contain md:h-[30px] lg:h-10 xl:h-[55px]"
          />
        </SwiperSlide>
      </Swiper>
      <NuxtLink
        to="/"
        class="relative flex ml-auto max-w-max text-xs text-slate-500 after:absolute after:-bottom-0.5 after:left-0 after:w-full after:h-0.5 after:bg-neutral-700 after:origin-right after:scale-x-0 after:rounded-full after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100"
      >
        View all manufacturers
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { A11y, Autoplay } from 'swiper';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import MicrochipLogo from '@/assets/media/home/microchip.png';
import TDKLogo from '@/assets/media/home/tdk.png';
import DigiKeyLogo from '@/assets/media/home/digi-key.png';
import QuectelLogo from '@/assets/media/home/quectel.png';
import MaximIntegratedLogo from '@/assets/media/home/maxim-integrated.png';
import TrestonLogo from '@/assets/media/home/treston.png';
import TexasInstrumentsLogo from '@/assets/media/home/texas-instruments.png';

const logos = [MicrochipLogo, TDKLogo, DigiKeyLogo, QuectelLogo, MaximIntegratedLogo, TrestonLogo, TexasInstrumentsLogo];
</script>

<style lang="scss">
.homeManufacturers--swiper {
  @apply lg:px-[14px] xl:pl-[38px] xl:pr-0 #{!important};
}
.homeManufacturers--swiper .swiper-slide:last-child {
  margin-right: 0 !important;
}
.homeManufacturers--swiper .swiper-wrapper {
  @apply md:justify-between #{!important};
}
</style>
