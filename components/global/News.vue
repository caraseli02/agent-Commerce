<template>
  <section class="mb-7 md:mb-[38px] xl:mb-[58px]">
    <div class="container">
      <h2 class="text-xl font-semibold mb-[11px] md:mb-4">News</h2>
      <ul
        class="grid grid-cols-1 gap-[15px] px-1 pt-1 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4"
      >
        <li v-for="(item, index) in news" :key="index">
          <NuxtLink :to="`/`" class="flex flex-col rounded-md bg-white shadow-xs">
            <img
              :src="item.cover"
              alt="Cover"
              class="aspect-[1.69] rounded-t-md md:aspect-[1.76] lg:aspect-[2.11]"
              loading="lazy"
            >
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
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import NewsCover1 from '@/assets/media/home/news-1.jpg';
import NewsCover2 from '@/assets/media/home/news-2.jpg';
import NewsCover3 from '@/assets/media/home/news-3.jpg';

const news = ref([
  {
    slug: 'nexperia-mosfets',
    title: 'Nexperia launches hot-swap application-specific MOSFETs (ASFE)',
    date: '29 OCT 2024',
    cover: NewsCover1,
  },
  {
    slug: 'analog-lead-times',
    title: 'Analog Devices expands allocation for industrial interface ICs',
    date: '12 OCT 2024',
    cover: NewsCover2,
  },
  {
    slug: 'passive-stock',
    title: 'Passives lead times stabilize across high-volume MLCC lines',
    date: '03 OCT 2024',
    cover: NewsCover3,
  },
  {
    slug: 'connector-standards',
    title: 'USB-C receptacles now qualified for extended temperature ranges',
    date: '18 SEP 2024',
    cover: NewsCover2,
  },
]);
</script>
