<template>
  <section class="mb-[30px] lg:mb-10">
    <div class="container">
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div
          class="relative flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-[30px] py-[13px] overflow-hidden"
        >
          <div class="relative z-20 flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
            <NewIcon class="w-8 h-8 flex-shrink-0 md:w-[42px] md:h-[42px] md:mr-[15px]" />
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fast path</p>
              <h2 class="font-semibold md:text-[32px] lg:text-2xl xl:text-[32px]">Quote-ready parts for active orders</h2>
            </div>
          </div>
          <img :src="Banner1Item" alt="Banner" class="relative z-20 w-[100px] object-contain md:w-[175px]" loading="lazy" />
          <img
            :src="Banner1Bg"
            alt=""
            class="absolute top-0 left-0 w-full h-full object-cover rounded-md opacity-20"
            loading="lazy"
            aria-hidden="true"
          />
        </div>
        <div
          class="relative flex items-center justify-between rounded-md px-[30px] py-[13px] overflow-hidden border border-slate-200 bg-slate-800"
        >
          <div class="relative z-20 flex flex-col gap-1 md:flex-row md:items-center">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Buyer support</p>
              <h2 class="font-semibold text-white md:text-[32px] lg:text-2xl xl:text-[32px]">Compare inventory and pricing in one place</h2>
            </div>
          </div>
          <img :src="Banner2Item" alt="Banner" class="relative z-20 w-[100px] object-contain md:w-[175px]" loading="lazy" />
          <img
            :src="Banner2Bg"
            alt=""
            class="absolute top-0 left-0 w-full h-full object-cover rounded-md opacity-15"
            loading="lazy"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import NewIcon from '@/assets/icons/new.svg';
import Banner1Item from '@/assets/media/home/banner-item.png';
import Banner1Bg from '@/assets/media/home/banner-bg.jpg';
import Banner2Item from '@/assets/media/home/exclusive-offer-item.png';
import Banner2Bg from '@/assets/media/home/exclusive-offer-bg.jpg';
</script>
