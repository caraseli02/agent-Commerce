<template>
  <DashboardWidgetBoundary title="Returning Customers" widget-id="returning-customers">
    <div class="relative flex h-full flex-col bg-white rounded-xl p-4 shadow-xs md:p-6">
      <div class="flex items-start justify-between">
        <div class="leading-normal font-semibold">Returning Customers</div>
        <div v-if="error" class="flex justify-end w-10 h-10">
          <WarningIcon class="w-6 h-6" />
        </div>
        <div v-else class="flex items-center justify-center bg-rose-500 rounded-full w-10 h-10">
          <PeopleIcon class="w-6 h-6" />
        </div>
      </div>
      <template v-if="series.length > 0">
        <SkeletonLoader v-if="loading" class="w-full h-[54px] my-7" />
        <template v-else>
          <div class="flex items-center justify-between -my-1.5">
            <div class="text-4xl leading-normal font-semibold">
              {{ total }}
            </div>
            <div>
              <DashboardReturningCustomersChart :chart-options="chartOptions" :series="series" />
            </div>
          </div>
        </template>
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <SkeletonLoader v-if="loading" class="w-[60px] h-5 mr-1" />
            <template v-else>
              <ArrowUpIcon v-if="delta > 0" class="w-4 h-4 mr-1" />
              <ArrowDownIcon v-else-if="delta < 0" class="w-4 h-4 mr-1" />
              <div class="text-sm leading-[1.43] font-medium mr-1" :class="'text-[' + [color] + ']'">
                {{ `${delta}%` }}
              </div>
            </template>
            <UiButton variant="ghost" class="flex h-auto p-0 hover:bg-transparent" @click="showOptions = !showOptions">
              <span class="text-sm left-[1.43] text-slate-500 font-medium mr-1">
                {{ selectedOption.label }}
              </span>
              <ChevronIcon class="w-5 h-5 text-slate-500 transition-transform duration-300" :class="[showOptions ? 'rotate-180' : '']" />
            </UiButton>
          </div>
          <UiButton
            variant="link"
            disabled
            class="flex h-auto p-0 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span class="text-sm font-medium left-[1.43] text-slate-500 mr-1">
              <span class="md:hidden lg:inline-block"> View </span> more
            </span>
            <ArrowRightIcon class="w-4 h-4" />
          </UiButton>
        </div>
      </template>
      <div v-else class="flex flex-col items-center justify-center flex-1 max-lg:mt-11 max-lg:mb-3">
        <EmojiSadIcon class="w-[52px] h-[52px] mb-4" />
        <div class="text-sm font-medium leading-normal text-gray-500">No data available</div>
      </div>
      <Transition name="fade-full">
        <div
          v-if="showOptions"
          v-click-outside="() => (showOptions = false)"
          class="absolute z-10 -bottom-0.5 left-0 translate-y-full grid grid-cols-1 gap-1 rounded-lg bg-white p-3 w-[200px] shadow-m"
        >
          <UiButton
            v-for="(option, index) in options"
            :key="index"
            variant="ghost"
            class="flex h-auto justify-start w-full text-left px-3 py-2 rounded-lg transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
            :class="selectedOption.label === option.label ? 'bg-[#F2F2F2] text-blue-500' : ''"
            @click="
              showOptions = false;
              selectedOption = option;
            "
          >
            <span class="text-sm leading-[1.71] font-medium">{{ option.label }}</span>
          </UiButton>
        </div>
      </Transition>
    </div>
  </DashboardWidgetBoundary>
</template>

<script setup lang="ts">
import type { ApexOptions } from 'apexcharts';
import { differenceInDays, startOfISOWeek } from 'date-fns';
import PeopleIcon from '@/assets/icons/dashboard/people.svg';
import ArrowDownIcon from '@/assets/icons/dashboard/arrow-down.svg';
import ArrowUpIcon from '@/assets/icons/dashboard/arrow-up.svg';
import ChevronIcon from '@/assets/icons/dashboard/chevron-down.svg';
import ArrowRightIcon from '@/assets/icons/dashboard/arrow-right.svg';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';
import WarningIcon from '@/assets/icons/dashboard/warning.svg';
import { fetchReturningCustomersWidget } from '~/composables/api/dashboard-admin';
import type { ReturningCustomersInterface } from '~~/types/dashboard/admin-users';

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
    colors: ['#FA4B4B'],
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

const showOptions = ref(false);
const selectedOption = ref({ label: 'Last 7 Days', time: 7 });

const start = startOfISOWeek(Date.now());
const thisWeekDifference = differenceInDays(Date.now(), start);

const options = [
  { label: 'Last 24h', time: 1 },
  { label: 'This Week', time: thisWeekDifference },
  { label: 'Last 7 Days', time: 7 },
  { label: 'Last 30 Days', time: 30 },
  { label: 'All Time', time: -1 },
];

const error = ref(false);
const loading = ref(true);

const series = ref<{ data: number[] }[]>([]);
const total = ref(0);
const delta = ref(0);
const color = ref('');

const fetchAndSetReturningCustomers = async (time = 7) => {
  loading.value = true;
  error.value = false;

  const data = await fetchReturningCustomersWidget(time);

  if (!data || data.status !== 'success') {
    loading.value = false;
    error.value = true;
    return;
  }

  loading.value = false;

  const widgetData = data as ReturningCustomersInterface;

  series.value = widgetData.data.series;

  total.value = widgetData.data.total;
  delta.value = widgetData.data.delta;
  color.value = delta.value !== 0 ? (delta.value > 0 ? '#00D395' : '#FA4B4B') : 'gray-300';

  if (chartOptions?.stroke?.colors instanceof Array) {
    chartOptions.stroke.colors[0] = delta.value >= 0 ? '#00D395' : '#FA4B4B';
  }
};

fetchAndSetReturningCustomers(selectedOption.value.time);

watch([selectedOption], async ([newSelectedOption]) => {
  await fetchAndSetReturningCustomers(newSelectedOption.time);
});
</script>
