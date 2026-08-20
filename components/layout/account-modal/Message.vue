<template>
  <div>
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
          spaceBetween: 0,
        },
        1280: {
          slidesPerView: 1,
        },
      }"
      class="homeNews--swiper"
    >
      <SwiperSlide v-for="(message, index) in messages" :key="index">
        <div class="self-stretch bg-white flex flex-col m-2 p-4 rounded-xl items-end w-fit shadow-s z-10">
          <div class="justify-between items-stretch self-stretch flex gap-5">
            <div class="text-neutral-800 text-sm font-medium leading-5 grow">{{ message.title }}</div>
            <svgo-x class="w-[18px] h-[18px]" />
          </div>
          <div class="self-stretch text-neutral-800 text-xs leading-4 mt-2">
            {{ message.body }}
          </div>
          <NuxtLink v-if="message.actionTo" :to="message.actionTo" class="items-center flex gap-2 mt-2">
            <svgo-menu-icon-setting-blue class="w-4 h-4" />
            <div class="text-blue-500 hover:text-blue-400 text-sm font-medium leading-5 self-stretch grow whitespace-nowrap">
              {{ message.actionLabel }}
            </div>
          </NuxtLink>
        </div>
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<script setup lang="ts">
import { A11y, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/vue';

const messages = [
  {
    title: 'Verify shipping defaults',
    body: 'Your account ships to a single default address. Confirm billing and delivery details before placing high-value orders.',
    actionLabel: 'Account settings',
    actionTo: '/dashboard/client?tab=settings',
  },
  {
    title: 'Credit limit reminder',
    body: 'Open purchase orders count toward your available credit. Review limits in the control panel before submitting large BOMs.',
    actionLabel: 'View credit',
    actionTo: '/dashboard/client?tab=home',
  },
];
</script>

<style scoped>
@reference "../../../assets/css/main.css";
.homeNews--swiper {
  @apply px-0 pt-0 pb-[30px]!;
}
</style>
