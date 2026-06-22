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
      <SwiperSlide v-for="item in 9" :key="item">
        <div class="self-stretch bg-white flex flex-col m-2 p-4 rounded-xl items-end w-fit shadow-s z-10">
          <div class="justify-between items-stretch self-stretch flex gap-5">
            <div class="text-neutral-800 text-sm font-medium leading-5 grow whitespace-nowrap">Account warning message</div>
            <svgo-x class="w-[18px] h-[18px]" />
          </div>
          <div class="self-stretch text-neutral-800 text-xs leading-4 mt-2">
            Contrary to popular belief, Lorem Ipsum is not simply random text. Contrary to popular belief, Lorem Ipsum is not simply random
            text. Contrary to popular belief, Lorem Ipsum is not simply random text.
          </div>
          <NuxtLink to="#" class="items-center flex gap-2 mt-2">
            <svgo-menu-icon-setting-blue class="w-4 h-4" />
            <div class="text-blue-500 hover:text-blue-400 text-sm font-medium leading-5 self-stretch grow whitespace-nowrap">Settings</div>
          </NuxtLink>
        </div>
      </SwiperSlide>
    </Swiper>
  </div>
</template>

<script setup lang="ts">
import { A11y, Pagination } from 'swiper';
</script>

<style scoped lang="scss">
.homeNews--swiper {
  @apply px-0 pt-0 pb-[30px] #{!important};
}
</style>
