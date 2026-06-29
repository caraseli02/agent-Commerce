<template>
  <div class="flex flex-row gap-[46px] p-9 linear-gradient rounded-xl shadow-xs w-full mb-9">
    <div class="flex flex-col gap-9">
      <div class="flex flex-col gap-6">
        <h2 class="text-[#FFF] text-[32px] font-bold leading-9">October Hot Sale</h2>
        <p class="text-[#FFF] text-base font-normal leading-6 text-">
          Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45
          BC, making it over 2000 years old.
        </p>
      </div>
      <div>
        <button class="px-6 rounded-lg bg-[#F2F2F2]">
          <div class="p-2">
            <span class="text-[#5E6278] text-base font-medium leading-7">View More</span>
          </div>
        </button>
      </div>
    </div>
    <div>
      <img class="min-w-[280px] min-h-[240px] object-contain" :src="HotSaleItem" alt="Electronics hot sale product" loading="lazy" />
    </div>
  </div>
</template>

<script setup lang="ts">
import HotSaleItem from '@/assets/media/home/black-friday-item.png';

defineOptions({
  name: 'BannerImageCard',
});
</script>

<style scoped lang="scss">
.linear-gradient {
  background: linear-gradient(264deg, #418dff 0%, #454dbb 62.59%, #463eab 99.53%);
}
</style>
