<template>
  <div
    class="relative bg-white rounded-xl p-4 shadow-xs md:p-6 xl:pb-10 xl:shadow-none xl:rounded-none xl:after:absolute xl:after:bottom-0 xl:after:left-1/2 xl:after:-translate-x-1/2 xl:after:bg-gray-100 xl:after:h-px xl:after:w-[calc(100%-48px)]"
  >
    <div class="mb-4">
      <div class="flex items-start justify-between">
        <h2 class="text-xl leading-[1.4] font-semibold">Customer Credit</h2>
        <button
          class="flex items-center justify-center rounded-lg w-8 h-8 text-slate-500 transition-colors duration-300 hover:text-blue-500 disabled:pointer-events-none"
          :disabled="loading || error"
          @click="$emit('toggle-editing')"
        >
          <EditIcon v-if="!loading && !error" class="w-6 h-6" />
          <WarningIcon v-if="error" class="w-6 h-6" />
        </button>
      </div>
    </div>
    <p class="text-sm leading-[1.71] mb-[68px] md:mb-7 lg:mb-9">Change to customer credit account.</p>
    <div
      class="md:grid md:grid-cols-[200px_1fr] md:grid-rows-[repeat(2,auto)] md:items-center md:gap-x-9 md:gap-y-8 lg:grid-cols-1 lg:gap-y-9 xl:gap-y-4"
    >
      <SkeletonLoader v-if="loading" class="w-full h-[71px] max-md:mb-12" />
      <div
        v-else-if="chartSeries[0] !== null"
        class="grid grid-cols-3 border border-border rounded-lg p-3 max-md:mb-12 md:order-2 lg:order-1"
      >
        <div class="relative pr-4 after:absolute after:w-px after:top-0 after:right-0 after:h-full after:bg-border">
          <div class="text-xs leading-[1.5] font-medium text-slate-500 mb-2">Credit Limit</div>
          <div class="text-sm leading-[1.43] font-semibold">
            {{ (creditObject?.limit ? getAmountFormat(creditObject.limit) : '0') + ' Lei' }}
          </div>
        </div>
        <div class="relative px-4 after:absolute after:w-px after:top-0 after:right-0 after:h-full after:bg-border">
          <div class="text-xs leading-[1.5] font-medium text-slate-500 mb-2">Till Due</div>
          <div class="text-sm leading-[1.43] font-semibold">
            {{ creditObject?.tillDue ? creditObject.tillDue + ' days' : '-' }}
          </div>
        </div>
        <div class="pl-4">
          <div class="text-xs leading-[1.5] font-medium text-slate-500 mb-2">Due Date</div>
          <div class="text-sm leading-[1.43] font-semibold">
            {{ formatReviewerDate(creditObject?.dueDate) }}
          </div>
        </div>
      </div>
      <div v-if="loading" class="flex items-center justify-center w-full h-[249px] max-md:mb-8">
        <SkeletonLoader class="w-[180px] h-[180px] mx-auto" type="circle" />
      </div>
      <div v-else class="relative flex justify-center max-md:mb-8 md:order-1 md:row-span-2 lg:order-2">
        <ClientOnly>
          <ApexChart width="270" height="270" :options="chartOptions" :series="chartSeries" />
        </ClientOnly>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-max flex flex-col text-center">
          <div class="text-xl font-bold leading-[1.4] mb-2" :class="[chartSeries[0] !== 0 ? 'text-[#EE514E]' : '']">
            {{
              creditObject?.available?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || '0,00'
            }}
            Lei
          </div>
          <div class="text-sm leading-[1.14]">Available Credit</div>
        </div>
      </div>
      <button
        v-if="chartSeries[0] === 0"
        class="flex items-center justify-center w-full bg-blue-500 rounded-lg px-5 py-2 text-white h-11 md:order-3"
        @click="$emit('toggle-editing')"
      >
        Credit Account
      </button>
      <div v-else class="md:order-3">
        <div class="text-sm leading-[1.71] font-semibold mb-6">Total Spent</div>
        <SkeletonLoader v-if="loading" class="w-full h-12" />
        <template v-else>
          <div v-if="creditObject?.limit" class="flex items-center gap-2 mb-4">
            <span class="text-xl leading-[1.2] font-semibold">
              {{
                creditObject?.spent !== null && creditObject?.spent !== undefined ? `${getAmountFormat(creditObject.spent)} Lei` : '0 Lei'
              }}
            </span>
            <span class="text-sm leading-[1.71]"> spent of </span>
            <span class="text-sm leading-[1.71] font-medium">
              {{
                creditObject?.limit !== null && creditObject?.limit !== undefined ? `${getAmountFormat(creditObject.limit)} Lei` : '0 Lei'
              }}
            </span>
            <span class="text-sm leading-[1.71]"> limit </span>
          </div>
          <ProgressBar :value="creditObject" />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import type { ApexOptions } from 'apexcharts';
import { formatReviewerDate } from '~/helpers/reviewer-dates';
import ProgressBar from './ProgressBar.vue';
import EditIcon from '@/assets/icons/dashboard/edit.svg';
import WarningIcon from '@/assets/icons/dashboard/warning.svg';
import type { CustomerCreditInterface } from '~/types/auth/account-settings';
import { useControlPanel } from '~/composables/useControlPanel';

const { loadCustomerCredit } = useControlPanel();

const ApexChart = defineAsyncComponent(() => import('vue3-apexcharts'));

defineEmits(['toggle-editing']);

const credit = ref(0);
const creditObject = ref<CustomerCreditInterface>({} as CustomerCreditInterface);
const chartSeries = ref([0]);
const chartOptions = ref({
  chart: {
    type: 'radialBar',
  },
  plotOptions: {
    radialBar: {
      hollow: {
        margin: 0,
        size: '75%',
        background: '#fff',
        image: undefined,
        imageOffsetX: 0,
        imageOffsetY: 0,
        position: 'front',
      },
      track: {
        background: '#EBEBEB',
        strokeWidth: '100%',
        margin: 0,
      },
      dataLabels: {
        show: false,
      },
    },
  },
  fill: {
    type: 'image',
    image: {
      src: ['/customer-credit-chart-bg.webp'],
      width: 228,
      height: 228,
    },
  },
  stroke: {
    lineCap: 'round',
  },
  labels: [''],
} as ApexOptions);

const config = useRuntimeConfig();
const isMockMode = computed(() => Boolean(config.public.MOCK_MODE));

const loading = ref(true);
const error = ref(false);

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

const getCustomerCredit = async () => {
  if (!props.id) {
    return;
  }
  try {
    const creditData = await loadCustomerCredit(props.id);

    if (creditData === null && !isMockMode.value) {
      setTimeout(() => {
        loading.value = false;
        error.value = true;
      }, 100);
      return;
    }

    const fallbackCredit: CustomerCreditInterface = {
      limit: 12000,
      spent: 3200,
      available: 8800,
      dueDate: new Date().toISOString(),
      tillDue: '30',
      term: 30,
      freeze: false,
      active: true,
    };

    const data = creditData ?? fallbackCredit;

    setTimeout(() => {
      loading.value = false;
      error.value = false;
    }, 100);

    creditObject.value = data;
    credit.value = data?.available;

    if (creditObject?.value) {
      chartSeries.value[0] = parseFloat(((creditObject?.value.spent / creditObject?.value.limit) * 100).toFixed(2));
    } else {
      chartSeries.value[0] = 0;
    }
  } catch (caughtError) {
    console.error('Failed to load customer credit summary', caughtError);
    if (!isMockMode.value) {
      setTimeout(() => {
        loading.value = false;
        error.value = true;
      }, 100);
      return;
    }

    creditObject.value = {
      limit: 12000,
      spent: 3200,
      available: 8800,
      dueDate: new Date().toISOString(),
      tillDue: '30',
      term: 30,
      freeze: false,
      active: true,
    };
    credit.value = creditObject.value.available;
    chartSeries.value[0] = parseFloat(((creditObject.value.spent / creditObject.value.limit) * 100).toFixed(2));
    setTimeout(() => {
      loading.value = false;
      error.value = false;
    }, 100);
  }
};

await getCustomerCredit();

const getAmountFormat = (money: number) => {
  return money?.toLocaleString('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
</script>
