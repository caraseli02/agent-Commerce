<script setup lang="ts">
import StockStatus from './StockStatus.vue';

defineProps({
  item: Object,
  shortStock: Boolean,
  stockItem: Boolean,
});
</script>

<template>
  <div v-if="item">
    <div class="flex flex-row justify-between items-center">
      <span
        class="text-neutral-700 text-xs font-semibold leading-4 truncate xl:hidden max-w-[220px] sm:max-w-[350px] lg:max-w-[180px] xl:max-w-[260px]"
      >
        {{ item.id }}
      </span>
      <StockStatus
        :stock-item="stockItem"
        :short-stock="shortStock"
        :stock="item.productEntity?.stock"
      />
    </div>
    <div class="flex flex-col xl:flex-row max-w-[220px] sm:max-w-[350px] lg:max-w-[180px] xl:max-w-[260px] truncate">
      <span class="text-slate-500 text-xs font-normal leading-4">Description:&nbsp;</span>
      <span class="text-neutral-700 text-xs font-medium leading-4 truncate">{{ item.productEntity?.description }}</span>
    </div>
  </div>
</template>
