<template>
  <div class="items-stretch self-stretch bg-gray-100 flex flex-col p-3 rounded-xl">
    <div class="justify-between items-stretch flex gap-5 px-0.5">
      <div class="text-neutral-800 text-xs font-medium leading-4 whitespace-nowrap">Available Credit</div>
      <div class="text-neutral-800 text-xs font-semibold leading-4 whitespace-nowrap">
        {{ availableCreditFormatted }}
      </div>
    </div>
    <div class="bg-gray-200 flex items-start justify-start shrink-0 h-4 flex-col mt-3 rounded-full">
      <div class="bg-green-500 rounded-full text-xs leading-none h-full z-10" :style="{ width: spentPercentage + '%' }" />
    </div>
    <div class="justify-between items-stretch flex w-full gap-5 mt-3 px-0.5">
      <div class="items-stretch flex justify-between gap-1">
        <div class="text-gray-500 text-xs font-medium leading-5 whitespace-nowrap">Spent:</div>
        <div class="text-gray-500 text-xs font-medium leading-5 whitespace-nowrap">
          {{ balanceFormatted }}
        </div>
      </div>
      <NuxtLink to="#" class="items-center flex justify-between gap-2">
        <div class="text-blue-500 hover:text-blue-400 text-sm font-medium leading-5 grow whitespace-nowrap">View more</div>
        <ArrowRightIcon class="w-4 h-4" />
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import ArrowRightIcon from '@/assets/icons/menu/arrow-right.svg';
import { useAuthStore } from '~/store/authStore';

const authStore = useAuthStore();
const { getUserDetails } = storeToRefs(authStore);

const availableCredit = computed(() => getUserDetails.value?.adminSettings?.customerCredit?.available || 0);
const balance = computed(() => getUserDetails.value?.adminSettings?.customerCredit?.limit || 0);

// Format numbers with two decimal places and euro symbol
const availableCreditFormatted = computed(() => `${availableCredit.value.toFixed(2)} Lei`);
const balanceFormatted = computed(() => `${balance.value.toFixed(2)} Lei`);

// Calculate the spent percentage
const spentPercentage = computed(() => {
  if (availableCredit.value === 0) return 0; // Avoid division by zero
  return Math.min((balance.value / availableCredit.value) * 100, 100); // Cap at 100%
});
</script>

<style scoped></style>
