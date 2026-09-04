<template>
  <section
    class="relative min-h-[220px] overflow-hidden rounded-2xl border border-slate-700 bg-[#102544] shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
  >
    <div
      class="relative z-10 flex min-h-[220px] flex-col justify-center px-5 py-8 text-white sm:px-8 md:px-10 md:py-10 lg:max-w-[68%] xl:px-12"
    >
      <h2 class="max-w-xl text-2xl font-semibold leading-tight md:text-3xl">Make a shortlist your team can trust.</h2>
      <p class="mt-3 max-w-xl text-sm leading-6 text-slate-300 md:text-base">
        Compare stock, lead times, manufacturers, and volume pricing in the catalog before you send a purchase request for review.
      </p>
      <NuxtLink
        to="/search"
        class="mt-5 inline-flex min-h-11 w-fit items-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#102544]"
      >
        Browse the catalog <span aria-hidden="true" class="ml-2">→</span>
      </NuxtLink>
    </div>
    <ImageWithFallback
      :src="item.item"
      alt="Electronic component assortment"
      class-name="absolute bottom-[-16px] right-[-12px] z-10 w-[180px] object-contain opacity-90 sm:right-5 sm:w-[220px] md:right-8 md:w-[260px] xl:right-16 xl:w-[300px]"
    />
    <ImageWithFallback :src="item.bg" alt="" class-name="absolute inset-0 h-full w-full object-cover opacity-25" />
    <div class="pointer-events-none absolute inset-0 bg-[#07152b]/45" aria-hidden="true" />
  </section>
</template>

<script setup lang="ts">
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import SlideBg from '@/assets/media/home/exclusive-offer-bg.webp';
import ItemImage from '@/assets/media/home/exclusive-offer-item.png';

const item = {
  bg: SlideBg,
  item: ItemImage,
};
</script>
