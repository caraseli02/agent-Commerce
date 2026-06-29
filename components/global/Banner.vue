<template>
  <section class="mb-[30px] lg:mb-10 xl:mb-[60px]">
    <div class="container">
      <div
        class="relative flex items-center justify-between rounded-md border border-slate-200 bg-gradient-to-r from-slate-50 to-white py-[13px] pl-5 pr-[15px] overflow-hidden md:px-10 md:py-[5px] lg:pl-[50px] lg:pr-[114px] xl:pr-[200px] xl:py-1.5"
      >
        <div class="relative z-20 flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
          <NewIcon class="w-8 h-8 md:w-[42px] md:h-[42px] md:mr-[15px]" />
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Procurement highlight</p>
            <h2 class="font-semibold md:text-[32px] lg:text-4xl">Stock visibility for urgent sourcing</h2>
          </div>
        </div>
        <img :src="BannerItem" alt="Banner" class="relative z-20 w-[100px] object-contain md:w-[166px] xl:w-[210px]" loading="lazy" />
        <div class="absolute z-10 top-0 left-0 w-full h-full bg-white/20 backdrop-blur-lg rounded-md" />
        <img :src="BannerBg" alt="Background" class="absolute top-0 left-0 w-full h-full object-cover rounded-md" loading="lazy" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import NewIcon from '@/assets/icons/new.svg';
import BannerItem from '@/assets/media/home/banner-item.png';
import BannerBg from '@/assets/media/home/banner-bg.jpg';
</script>
