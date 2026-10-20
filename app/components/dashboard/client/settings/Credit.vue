<script setup lang="ts">
import { CreditCard } from '@lucide/vue';

import { storeToRefs } from 'pinia';
import { useAuthStore } from '~/store/authStore';

const authStore = useAuthStore();
const { getUserDetails } = storeToRefs(authStore);

const availableCredit = ref(getUserDetails.value?.adminSettings?.customerCredit?.available || 0);
const balance = ref(getUserDetails.value?.adminSettings?.customerCredit?.limit || 0);

const creditUsagePercentage = computed(() => {
  return (availableCredit.value / balance.value) * 100;
});

const handlePayNow = () => {};
</script>

<template>
  <section class="flex flex-col self-stretch p-4 md:p-6 bg-card rounded-xl shadow-l">
    <h2 class="text-xl font-semibold leading-7 text-foreground max-md:max-w-full">Account Credit</h2>
    <div class="flex flex-col py-6 mt-8 bg-card rounded-xl max-md:max-w-full">
      <div class="flex gap-2 justify-between leading-[133%] max-md:flex-wrap max-md:max-w-full">
        <div class="flex flex-col justify-center">
          <p class="text-2xl font-semibold tracking-normal text-foreground">{{ availableCredit.toFixed(2) }} Lei</p>
          <p class="mt-1 text-xs font-medium text-muted-foreground">Available Credit</p>
        </div>
        <svg
          class="text-slate-300 shrink-0 self-start w-6 aspect-square lucide lucide-ellipsis-vertical"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </div>
      <div class="flex flex-col justify-center mt-6 bg-gray-200 rounded-full max-md:max-w-full">
        <div class="shrink-0 h-3 bg-emerald-500 rounded-full max-md:max-w-full" :style="{ width: `${creditUsagePercentage}%` }" />
      </div>
      <div class="flex gap-5 justify-between mt-4 w-full max-md:flex-wrap max-md:max-w-full">
        <div class="flex gap-2">
          <p class="text-base font-medium leading-6 text-muted-foreground">Balance:</p>
          <p class="text-lg font-semibold leading-6 text-foreground">{{ balance.toFixed(2) }} Lei</p>
        </div>
        <button class="flex gap-1 text-base font-semibold leading-6 text-muted-foreground" @click="handlePayNow">
          <CreditCard class="shrink-0 w-6 aspect-square" />
          <span>Pay now</span>
        </button>
      </div>
    </div>
  </section>
</template>
