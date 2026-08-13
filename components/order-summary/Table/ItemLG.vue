<template>
  <div class="rounded-md shadow-m px-[15px] py-2 font-Inter">
    <div
      class="grid grid-cols-[75px,1fr,100px,64px,145px,120px,120px] items-center 2xl:grid-cols-[32px,75px,1fr,100px,64px,145px,130px,120px]"
    >
      <div
        class="flex items-center justify-center w-[22px] h-[22px] border border-border rounded text-sm font-medium leading-tight text-slate-500 max-2xl:hidden"
      >
        {{ index }}
      </div>
      <NuxtImg :src="String(item.cover ?? '')" :alt="item.title" class="w-[65px] h-[65px]" loading="lazy" />
      <div>
        <div class="mb-1 flex flex-col items-start 2xl:flex-row 2xl:items-center">
          <div class="font-semibold leading-tight mr-2.5">
            {{ item.title }}
          </div>
          <button class="flex border border-border rounded px-2 py-[3px] text-sm font-semibold leading-tight text-slate-500">
            CUSTOM1234
          </button>
        </div>
        <div class="text-xs leading-tight truncate mb-1">Diode: rectifying; SMD; 100V; 0.15...</div>
        <div class="flex flex-col 2xl:flex-row 2xl:items-center">
          <div class="text-xs leading-tight mb-[5px] mr-2.5 2xl:mb-0">Manufacturer: Microchip</div>
          <div class="flex items-center bg-green-500">
            <CheckIcon class="w-4 h-4 mr-1" />
            <span class="text-xs leading-tight font-semibold"> 16,000 in stock </span>
          </div>
        </div>
      </div>
      <div class="flex flex-col font-semibold">
        <span v-if="item.discount" class="text-sm text-slate-500 mb-0.5"> $150,00 </span>
        <span :class="[item.discount ? 'bg-green-500 mb-2.5' : '']"> $120,00 </span>
        <div v-if="item.discount" class="flex bg-rose-500 rounded-[25px] px-1.5 py-0.5 text-xs font-extrabold text-white self-start ml-4">
          {{ item.discount }}%
        </div>
      </div>
      <div>19%</div>
      <QuantityButtons v-model="quantity" />
      <div class="font-semibold">$3000,00</div>
      <div class="flex items-center gap-[15px] text-slate-500">
        <button class="flex transition-colors duration-300 hover:text-blue-500">
          <D3Icon class="w-6 h-6" />
        </button>
        <button class="flex transition-colors duration-300 hover:text-blue-500">
          <TruckIcon class="w-6 h-6" />
        </button>
        <button class="flex transition-colors duration-300 hover:text-blue-500 ml-auto">
          <TrashIcon class="w-6 h-6" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { OrderSummaryItem } from '~~/types';
import D3Icon from '@/assets/icons/3d.svg';
import TruckIcon from '@/assets/icons/truck.svg';
import CheckIcon from '@/assets/icons/check-circle.svg';

defineProps({
  item: {
    type: Object as PropType<OrderSummaryItem>,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
});

const quantity = ref(0);
</script>
