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
          <NuxtLink :to="`/`" class="flex flex-col rounded-md bg-white shadow-xs">
            <NuxtImg :src="item.cover" alt="Cover" class="aspect-[1.69] rounded-t-md md:aspect-[1.76] lg:aspect-[2.11]" loading="lazy"/>
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
import NewsCover1 from '@/assets/media/home/news-1.jpg';
import NewsCover2 from '@/assets/media/home/news-2.jpg';
import NewsCover3 from '@/assets/media/home/news-3.jpg';

const news = ref([
  {
    slug: 'slug',
    title: 'Nexperia launches new hotswap Application Specific MOSFETs (ASFE)',
    date: '29 OCT 2023',
    cover: NewsCover1,
  },
  {
    slug: 'slug',
    title: 'Nexperia launches new hotswap Application Specific MOSFETs (ASFE)',
    date: '29 OCT 2023',
    cover: NewsCover2,
  },
  {
    slug: 'slug',
    title: 'Nexperia launches new hotswap Application Specific MOSFETs (ASFE)',
    date: '29 OCT 2023',
    cover: NewsCover3,
  },
  {
    slug: 'slug',
    title: 'Nexperia launches new hotswap Application Specific MOSFETs (ASFE)',
    date: '29 OCT 2023',
    cover: NewsCover2,
  },
  {
    slug: 'slug',
    title: 'Nexperia launches new hotswap Application Specific MOSFETs (ASFE)',
    date: '29 OCT 2023',
    cover: NewsCover1,
  },
  {
    slug: 'slug',
    title: 'Nexperia launches new hotswap Application Specific MOSFETs (ASFE)',
    date: '29 OCT 2023',
    cover: NewsCover2,
  },
  {
    slug: 'slug',
    title: 'Nexperia launches new hotswap Application Specific MOSFETs (ASFE)',
    date: '29 OCT 2023',
    cover: NewsCover3,
  },
  {
    slug: 'slug',
    title: 'Nexperia launches new hotswap Application Specific MOSFETs (ASFE)',
    date: '29 OCT 2023',
    cover: NewsCover2,
  },
  {
    slug: 'slug',
    title: 'Nexperia launches new hotswap Application Specific MOSFETs (ASFE)',
    date: '29 OCT 2023',
    cover: NewsCover1,
  },
  {
    slug: 'slug',
    title: 'Nexperia launches new hotswap Application Specific MOSFETs (ASFE)',
    date: '29 OCT 2023',
    cover: NewsCover2,
  },
  {
    slug: 'slug',
    title: 'Nexperia launches new hotswap Application Specific MOSFETs (ASFE)',
    date: '29 OCT 2023',
    cover: NewsCover3,
  },
  {
    slug: 'slug',
    title: 'Nexperia launches new hotswap Application Specific MOSFETs (ASFE)',
    date: '29 OCT 2023',
    cover: NewsCover2,
  },
]);
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
  @apply w-[25px] bg-gray-300 #{!important};
}
</style>
