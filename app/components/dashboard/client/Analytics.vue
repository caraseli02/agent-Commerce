<template>
  <ClientOnly>
    <div
      class="relative items-stretch shadow-xs bg-card flex w-full lg:w-fit md:min-w-[476px] xl:min-w-[472px] h-[240px] flex-col rounded-xl overflow-hidden pr-2"
    >
      <div v-if="isMobile" class="flex justify-between items-center px-4 py-2 absolute right-0 z-10">
        <UiButton size="xs" variant="ghost" class="text-lg rounded-full" @click="shiftMonths(-1)">
          <ChevronLeftIcon class="w-4 h-4 stroke-1" />
        </UiButton>
        <UiButton size="xs" variant="ghost" class="text-lg rounded-full" @click="shiftMonths(1)">
          <ChevronRightIcon class="w-4 h-4 stroke-1" />
        </UiButton>
      </div>
      <div class="max-w-[358px] md:max-w-[476px] md:min-w-fit mt-4 ml-1">
        <ApexChart height="215" type="bar" :options="chartOptions" :series="computedSeries" />
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import type { ApexOptions } from 'apexcharts';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue';

const ApexChart = defineAsyncComponent(() => import('vue3-apexcharts'));

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const fullData = [23, 44, 35, 30, 49, 60, 70, 91, 85, 48, 60, 70];
const currentIndex = ref(0);

const breakpoints = useBreakpoints(breakpointsTailwind);

const smallerThanMd = breakpoints.smaller('md');

const isMobile = computed(() => smallerThanMd.value);

const visibleMonths = computed(() => {
  if (isMobile.value) {
    const startIndex = (currentIndex.value * 6) % months.length;
    return months.slice(startIndex, startIndex + 6);
  }
  return months;
});

const computedSeries = computed(() => {
  if (isMobile.value) {
    return [
      {
        name: 'Orders',
        data: fullData.slice((currentIndex.value * 6) % months.length, ((currentIndex.value * 6) % months.length) + 6),
      },
    ];
  }
  return [
    {
      name: 'Orders',
      data: fullData,
    },
  ];
});
const chartOptions = computed(
  () =>
    ({
      chart: {
        type: 'bar',
        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false,
          columnWidth: '45%',
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent'],
      },
      xaxis: {
        categories: visibleMonths.value,
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        labels: {
          style: {
            colors: '#777',
            fontSize: '12px',
            fontFamily: 'Helvetica, Arial, sans-serif',
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: '#777',
            fontSize: '14px',
            fontFamily: 'Helvetica, Arial, sans-serif',
          },
        },
      },
      fill: {
        opacity: 1,
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return val + ' Orders';
          },
        },
      },
      colors: ['#008FFB'],
      grid: {
        show: false,
        borderColor: '#e7e7e7',
        strokeDashArray: 0,
        xaxis: {
          lines: {
            show: false,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        floating: true,
        offsetY: -25,
        offsetX: -5,
        markers: {
          radius: 12,
        },
      },
    }) as ApexOptions,
);

function shiftMonths(direction: number) {
  let newIdx = currentIndex.value + direction;
  if (newIdx < 0) {
    newIdx = Math.ceil(12 / 6) - 1; // wrap around to last period
  } else if (newIdx >= Math.ceil(12 / 6)) {
    newIdx = 0; // wrap around to first period
  }
  currentIndex.value = newIdx;
}
</script>

<style scoped>
button {
  background: none;
  border: none;
  cursor: pointer;
}

button:hover {
  color: blue;
}
</style>
