<template>
  <div class="relative flex h-full flex-col rounded-xl bg-card p-4 shadow-xs md:p-6">
    <div class="flex items-start justify-between">
      <h2 class="leading-normal font-semibold">Customers Total</h2>
      <WarningIcon v-if="error" class="w-6 h-6" />
    </div>
    <template v-if="loading || series.length > 0">
      <div class="mt-4 flex items-center justify-between">
        <UiSkeleton v-if="loading" class="h-10 w-24" />
        <div v-else class="text-4xl leading-normal font-semibold tabular-nums">{{ total }}</div>
        <div v-if="!loading">
          <ClientOnly>
            <ApexChart width="170" :options="chartOptions" :series="series" />
          </ClientOnly>
        </div>
      </div>
      <div class="mt-2 flex items-center text-sm leading-[1.43] font-medium">
        <UiSkeleton v-if="loading" class="h-5 w-24" />
        <template v-else>
          <span :class="deltaClass">{{ deltaLabel }}</span>
          <span class="ml-2 text-muted-foreground">Last 7 days</span>
        </template>
      </div>
    </template>
    <div v-else class="flex flex-col items-center justify-center flex-1 max-lg:mt-11 max-lg:mb-3">
      <EmojiSadIcon class="w-[52px] h-[52px] mb-4" />
      <div class="text-sm font-medium leading-normal text-muted-foreground">No data available</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import type { ApexOptions } from 'apexcharts';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';
import WarningIcon from '@/assets/icons/dashboard/warning.svg';
import { fetchTotalCustomersWidget } from '~/composables/api/dashboard-admin';
import type { TotalCustomersInterface } from '~~/types/dashboard/admin-users';

const ApexChart = defineAsyncComponent(() => import('vue3-apexcharts'));

const chartOptions: ApexOptions = {
  chart: {
    zoom: {
      enabled: false,
    },
    toolbar: {
      show: false,
    },
    animations: {
      enabled: true,
    },
    type: 'area',
    width: '145px',
    height: '48px',
  },
  legend: {
    show: false,
  },
  dataLabels: {
    enabled: false,
  },
  tooltip: {
    enabled: false,
  },
  stroke: {
    curve: 'smooth',
    width: 3,
    colors: ['#00D395'],
  },
  fill: {
    type: 'solid',
    colors: ['transparent'],
    opacity: 0,
  },
  xaxis: {
    axisBorder: {
      show: false,
    },
    labels: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
  },
  yaxis: {
    show: false,
  },
  grid: {
    show: false,
  },
};

const series = ref<{ data: number[] }[]>([]);
const total = ref(0);
const delta = ref(0);
const error = ref(false);
const loading = ref(true);

const fetchAndSetTotalCustomers = async (time = 7) => {
  loading.value = true;
  error.value = false;

  const data = await fetchTotalCustomersWidget(time);

  if (!data || data.status !== 'success') {
    loading.value = false;
    error.value = true;
    return;
  }

  loading.value = false;

  const widgetData = data as TotalCustomersInterface;

  // The last point is the still-open period, so it would plot as a false drop.
  series.value = widgetData.data.series.map((entry) => ({ ...entry, data: entry.data.slice(0, -1) }));
  total.value = widgetData.data.total;
  delta.value = widgetData.data.delta;

  if (chartOptions?.stroke?.colors instanceof Array) {
    chartOptions.stroke.colors[0] = delta.value >= 0 ? '#00D395' : '#FA4B4B';
  }
};

const deltaLabel = computed(() => `${delta.value > 0 ? '+' : ''}${delta.value}%`);
const deltaClass = computed(() => (delta.value >= 0 ? 'text-green-800 dark:text-green-400' : 'text-rose-700 dark:text-rose-400'));

fetchAndSetTotalCustomers();
</script>
