<template>
  <section class="mb-[30px] lg:mb-10 xl:mb-[60px]">
    <div class="container">
      <div
        class="relative flex min-h-[156px] items-start rounded-md border border-border bg-muted overflow-hidden py-5 pl-5 pr-[110px] md:min-h-0 md:items-center md:justify-between md:px-10 md:py-[5px] lg:pl-[50px] lg:pr-[114px] xl:pr-[200px] xl:py-1.5"
      >
        <div class="relative z-20 flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-4">
          <NewIcon class="w-8 h-8 md:w-[42px] md:h-[42px] md:mr-[15px]" />
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Procurement highlight</p>
            <h2 class="font-semibold md:text-[32px] lg:text-4xl">Stock visibility for urgent sourcing</h2>
          </div>
        </div>
        <ImageWithFallback
          :src="BannerItem"
          alt="Banner"
          class-name="absolute bottom-4 right-4 z-20 w-[86px] object-contain md:relative md:bottom-auto md:right-auto md:w-[166px] xl:w-[210px]"
        />
        <ImageWithFallback :src="BannerBg" alt="" class-name="absolute top-0 left-0 h-full w-full rounded-md object-cover" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import NewIcon from '@/assets/icons/new.svg';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import BannerItem from '@/assets/media/home/banner-item.png';
import BannerBg from '@/assets/media/home/banner-bg.webp';
</script>
