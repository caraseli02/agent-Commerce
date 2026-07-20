<template>
  <section class="mb-7 md:mb-[38px] xl:mb-[58px]">
    <div class="container">
      <h2 class="text-xl font-semibold mb-[11px] md:mb-4">News</h2>
      <Swiper
        :modules="[A11y, Pagination]"
        :slides-per-view="3"
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
          1280: {
            slidesPerView: 4,
          },
        }"
        class="homeNews--swiper"
      >
        <SwiperSlide v-for="(item, index) in news" :key="index">
          <NuxtLink :to="`/news/${item.slug}`" class="flex flex-col rounded-md bg-white shadow-xs">
            <img :src="item.cover" alt="Cover" class="aspect-[1.69] rounded-t-md md:aspect-[1.76] lg:aspect-[2.11]" loading="lazy" />
            <div
              class="flex flex-col items-center text-center font-Inter p-[5px] md:px-[15px] md:pt-2.5 md:pb-[15px] md:items-start md:text-left xl:p-[15px]"
            >
              <h3
                class="text-[11px] leading-tight font-semibold line-clamp-3 mb-1.5 md:text-sm md:mb-2.5 lg:text-base lg:line-clamp-2 xl:mb-[15px]"
              >
                {{ item.title }}
              </h3>
              <div class="text-[10px] leading-tight text-slate-500 md:text-xs">
                {{ item.date }}
              </div>
            </div>
          </NuxtLink>
        </SwiperSlide>
      </Swiper>
    </div>
  </section>
</template>

<script setup lang="ts">
import { A11y, Pagination } from 'swiper';
import { demoNewsArticles } from '~/pages/news/news-data';

const news = demoNewsArticles;
</script>

<style lang="scss">
.homeNews--swiper {
  @apply px-1 pt-1 pb-[30px] #{!important};
}
.homeNews--swiper .swiper-pagination {
  @apply bottom-0  space-x-1.5 md:space-x-2 #{!important};
}
.homeNews--swiper .swiper-pagination-bullet {
  @apply w-1.5 h-1.5 bg-gray-200  rounded-full opacity-100 m-0 transition-all duration-300 md:w-2 md:h-2 #{!important};
  margin-right: 0 !important;
}
.homeNews--swiper .swiper-pagination-bullet.swiper-pagination-bullet-active {
  @apply scale-125 bg-gray-300 #{!important};
}
</style>
