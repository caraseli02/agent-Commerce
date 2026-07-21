<template>
  <div
    class="grid grid-cols-2 grid-rows-2 gap-x-2.5 gap-y-[15px] px-5 pb-5 md:grid-cols-3 md:grid-rows-[85px] md:gap-[15px] md:px-[15px] md:pb-[15px] lg:grid-rows-[120px] xl:grid-cols-1 xl:grid-rows-3 xl:gap-5 xl:justify-between xl:p-[25px]"
  >
    <button
      class="relative flex flex-col rounded-md overflow-hidden p-[7px] pb-[30px] md:order-1 md:px-1.5 md:pt-2.5 md:pb-[42px] lg:p-[15px] xl:py-5 xl:items-start"
    >
      <div class="relative z-20 xl:flex xl:items-center xl:flex-row-reverse">
        <div class="text-xs font-semibold text-left md:text-[10px] lg:text-[13px] lg:mb-[15px] xl:text-[17px] xl:mb-0">
          Portfolio-ready sourcing demo
        </div>
        <NewIcon class="w-[18px] h-[18px] xl:w-7 xl:h-7 xl:mr-2.5" />
      </div>
      <img
        :src="Banner1"
        alt="Banner"
        class="absolute z-20 bottom-0 right-0 w-24 object-contain lg:w-[130px] xl:w-[160px]"
        loading="lazy"
      >
      <div class="absolute z-10 top-0 left-0 w-full h-full bg-slate-50/90 rounded-md" />
      <img
        :src="BannerBg"
        alt="Background"
        class="absolute top-0 left-0 w-full h-full object-cover rounded-md -scale-x-100"
        loading="lazy"
      >
    </button>
    <button
      class="relative flex flex-col rounded-md overflow-hidden p-[7px] pb-[30px] md:order-3 md:px-1.5 md:pt-2.5 lg:p-[15px] xl:order-2 xl:pt-5"
    >
      <div class="flex flex-col relative z-20 xl:h-full xl:justify-between">
        <div
          class="text-xs font-semibold text-left mb-1.5 md:text-[10px] md:mb-5 lg:text-[13px] lg:mb-[26px] xl:text-[17px] xl:leading-normal"
        >
          Treston 3D <br >
          Configurator
        </div>
        <img :src="TrestonLogo" alt="Logo" class="w-11 xl:w-[75px]" loading="lazy" >
      </div>
      <img
        :src="Banner2"
        alt="Banner"
        class="absolute z-20 bottom-0 right-0 w-20 object-contain lg:w-[120px] xl:w-[150px]"
        loading="lazy"
      >
      <div class="absolute z-10 top-0 left-0 w-full h-full bg-slate-50/90 rounded-md" />
      <img :src="BannerBg" alt="Background" class="absolute top-0 left-0 w-full h-full object-cover rounded-md" loading="lazy" >
    </button>
    <button
      class="relative flex flex-col col-span-2 rounded-md overflow-hidden px-[15px] py-6 md:order-2 md:col-span-1 md:px-1.5 md:py-2.5 lg:p-[15px] xl:order-3 xl:pt-5"
    >
      <div class="relative z-20 text-sm font-semibold text-left text-white md:text-[10px] lg:pr-5 lg:text-[13px] xl:text-[17px]">
        Automatic Optical Inspection
      </div>
      <img
        :src="Banner3"
        alt="Banner"
        class="absolute z-20 bottom-0 right-2 w-[88px] object-contain md:right-0 md:w-[76px] lg:w-[113px] xl:right-1 xl:w-[140px]"
        loading="lazy"
      >
      <div class="absolute z-10 top-0 left-0 w-full h-full bg-amber-500/80 rounded-md" />
      <img
        :src="BannerBg"
        alt="Background"
        class="absolute top-0 left-0 w-full h-full object-cover rounded-md -scale-x-100"
        loading="lazy"
      >
    </button>
  </div>
</template>

<script setup lang="ts">
import Banner1 from '@/assets/media/header/banner-1.png';
import Banner2 from '@/assets/media/header/banner-2.png';
import Banner3 from '@/assets/media/header/banner-3.png';
import TrestonLogo from '@/assets/media/header/treston-logo.png';
import BannerBg from '@/assets/media/home/banner-bg.jpg';
import NewIcon from '@/assets/icons/new.svg';
</script>
