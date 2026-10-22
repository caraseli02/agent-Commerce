<template>
  <div class="flex flex-col bg-card rounded-xl p-4 shadow-xs md:p-6">
    <div class="flex items-center justify-between mb-6 lg:mb-8">
      <h2 class="leading-normal font-semibold">Customers by Country</h2>
      <WarningIcon v-if="error" class="w-6 h-6" />
    </div>
    <div
      v-if="countries.length > 0 || loading"
      class="grid grid-cols-1 xl:flex-1"
      :class="[loading ? 'xl:grid-cols-[auto_1fr] xl:gap-x-12' : '']"
    >
      <div class="" :class="[loading ? 'md:w-[220px] xl:mr-0' : 'xl:mr-10']">
        <SkeletonLoader v-if="loading" class="w-2/3 h-[52px] mb-4 md:w-full" />
        <template v-else>
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2 md:gap-3">
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
            <div class="flex items-center gap-2 text-sm text-muted-foreground leading-[1.71]">
              Market share: <span class="text-foreground font-medium">{{ marketShare }}%</span>
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
      v-if="!loading && countries.length === 0"
      class="flex flex-col items-center justify-center flex-1 mt-[132px] mb-[148px] md:mt-[128px] xl:mt-[110px] xl:mb-[150px]"
    >
      <EmojiSadIcon class="w-[52px] h-[52px] mb-4" />
      <div class="text-sm font-medium leading-normal text-muted-foreground">No data available</div>
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
const marketShare = computed(() => {
  const total = countries.value.reduce((sum, country) => sum + country.count, 0);
  return total && countryWithMostCustomers.value ? Math.round((countryWithMostCustomers.value.count / total) * 100) : 0;
});
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
