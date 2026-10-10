<template>
  <div class="flex flex-col bg-white rounded-xl p-4 shadow-xs md:p-6">
    <div class="flex items-center justify-between mb-6 lg:mb-8">
      <div class="leading-normal font-semibold">Customers by Country</div>
      <WarningIcon v-if="error" class="w-6 h-6" />
    </div>
    <div v-if="countries.length > 0" class="grid grid-cols-1 xl:flex-1" :class="[loading ? 'xl:grid-cols-[auto_1fr] xl:gap-x-12' : '']">
      <div class="" :class="[loading ? 'md:w-[220px] xl:mr-0' : 'xl:mr-10']">
        <SkeletonLoader v-if="loading" class="w-2/3 h-[52px] mb-4 md:w-full" />
        <template v-else>
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2 md:gap-3">
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6">
                <rect y="2.85742" width="20" height="14.2857" rx="4" fill="white" />
                <mask id="mask0_801_26126" style="mask-type: luminance" maskUnits="userSpaceOnUse" x="0" y="2" width="20" height="16">
                  <path
                    d="M0 4.85742C0 3.75285 0.895431 2.85742 2 2.85742H18C19.1046 2.85742 20 3.75285 20 4.85742V15.1431C20 16.2477 19.1046 17.1431 18 17.1431H2C0.895431 17.1431 0 16.2477 0 15.1431V4.85742Z"
                    fill="white"
                  />
                </mask>
                <g mask="url(#mask0_801_26126)">
                  <rect x="9.52344" y="2.85742" width="10.4762" height="14.2857" fill="#E5253D" />
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M0 17.1431H6.66667V2.85742H0V17.1431Z" fill="#0A3D9C" />
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M6.66797 17.1431H13.3346V2.85742H6.66797V17.1431Z" fill="#FFD955" />
                </g>
              </svg>
              <div class="text-sm leading-[1.43] font-semibold">
                {{ countryWithMostCustomers?.label }}
              </div>
              <div class="flex items-center gap-2 md:gap-3">
                <div
                  class="w-3 h-3 rounded-full"
                  :style="{
                    backgroundColor: countryWithMostCustomers?.theme || '#5E6278',
                  }"
                />
                <div class="text-sm leading-[1.43] font-medium">
                  {{ countryWithMostCustomers?.count }}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-300 leading-[1.71]">
              Market Share: <span class="text-dark font-medium">83%</span>
            </div>
          </div>
        </template>
      </div>
      <div class="rounded-xl">
        <SkeletonLoader v-if="loading" class="w-full h-[208px] xl:h-[272px]" />
        <ClientOnly v-else>
          <DashboardWorld :countries="countries" />
        </ClientOnly>
      </div>
    </div>
    <div
      v-if="countries.length === 0"
      class="flex flex-col items-center justify-center flex-1 mt-[132px] mb-[148px] md:mt-[128px] xl:mt-[110px] xl:mb-[150px]"
    >
      <EmojiSadIcon class="w-[52px] h-[52px] mb-4" />
      <div class="text-sm font-medium leading-normal text-gray-100">No data available</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { fetchCustomersByCountryWidget } from '~/composables/api/dashboard-admin';
import type { CustomersByCountryInterface } from '~~/types/dashboard/admin-users';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';
import WarningIcon from '@/assets/icons/dashboard/warning.svg';

const DashboardWorld = defineAsyncComponent(() => import('~/components/dashboard/World.vue'));

type CountryDataItem = CustomersByCountryInterface['data'][number];

const countries = ref<CountryDataItem[]>([]);
const countryWithMostCustomers = ref<CountryDataItem | null>(null);
const loading = ref(true);
const error = ref(false);

const fetchAndSetCustomersByCountry = async () => {
  loading.value = true;
  error.value = false;

  const data = await fetchCustomersByCountryWidget();

  if (!data || data.status !== 'success') {
    loading.value = false;
    error.value = true;
    return;
  }

  loading.value = false;

  const widgetData = data as CustomersByCountryInterface;

  countries.value = widgetData?.data;

  if (!countries.value) {
    return;
  }

  countryWithMostCustomers.value = countries.value[0] ?? null;
};

fetchAndSetCustomersByCountry();
</script>
