<template>
  <div class="relative flex flex-col bg-card rounded-xl p-4 shadow-xs md:p-6">
    <div class="flex items-start justify-between" :class="[emptyData || error ? 'mb-[93px] md:mb-[85px]' : isLoading ? 'mb-6' : 'mb-5']">
      <div class="leading-normal font-semibold">Net Margin</div>
      <WarningIcon v-if="error" class="w-6 h-6" />
      <div v-else class="flex items-center justify-center bg-[#00D395] rounded-full w-10 h-10">
        <StatusIcon class="w-6 h-6" />
      </div>
    </div>
    <div v-if="emptyData || error" class="flex flex-col items-center justify-center flex-1 mb-[69px] md:mb-[61px]">
      <EmojiSadIcon class="w-[52px] h-[52px] mb-4" />
      <div class="text-sm font-medium text-muted-foreground">No data available</div>
    </div>
    <template v-else>
      <div class="mb-6">
        <SkeletonLoader v-if="isLoading" class="w-full h-20 mb-6" />
        <div v-else class="mb-[17px]">
          <ClientOnly>
            <ApexChart width="100%" height="80" :options="chartOptions" :series="series" />
          </ClientOnly>
        </div>
        <SkeletonLoader v-if="isLoading" class="w-full h-[46px]" />
        <div v-else class="text-[28px] leading-normal font-semibold">1,200,539.77 Lei</div>
      </div>
      <div class="flex items-center justify-center">
        <UiButton
          variant="link"
          disabled
          class="flex h-auto p-0 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span class="text-sm font-medium left-[1.43] text-muted-foreground mr-2">
            <span class="md:hidden lg:inline-block"> View </span> more
          </span>
          <ArrowRightIcon class="w-4 h-4" />
        </UiButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import type { ApexOptions } from 'apexcharts';
import StatusIcon from '@/assets/icons/dashboard/status-up.svg';
import ArrowRightIcon from '@/assets/icons/dashboard/arrow-right.svg';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';
import WarningIcon from '@/assets/icons/dashboard/warning.svg';

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
    colors: ['white'],
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

const series = ref([
  {
    data: ['-3', '0', '2', '-1', '4', '3', '0', '4', '5'],
  },
]);
const error = ref(false);
const emptyData = ref(false);
const isLoading = ref(false);
</script>
