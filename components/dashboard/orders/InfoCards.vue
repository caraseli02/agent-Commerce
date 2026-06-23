<template>
  <div class="relative z-20 grid grid-cols-1 gap-4 mb-9 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
    <div v-for="(card, indexOfWidget) in cards" :key="indexOfWidget" class="group bg-white rounded-xl p-4 pr-2 shadow-xs md:p-6 md:pr-4">
      <div
        class="flex items-start w-full mb-8 xl:mb-12"
        :class="[isLoading[indexOfWidget] ? 'justify-center md:justify-between' : 'justify-between']"
      >
        <div v-if="isLoading[indexOfWidget]" class="flex items-center justify-center gap-4">
          <SkeletonLoader class="w-14 h-14" type="circle" />
          <div>
            <SkeletonLoader class="w-[120px] h-5 mb-3" />
            <SkeletonLoader class="w-[180px] h-6 xl:w-full 2xl:w-[180px]" />
          </div>
        </div>
        <template v-else>
          <div class="flex items-center">
            <div class="mr-4">
              <EmojiSadIcon
                v-if="error[indexOfWidget] || card.menu.selected.value === null || card.menu.selected.value === undefined"
                class="w-[52px] h-[52px] py-0.5"
              />
              <div
                v-else
                class="flex items-center justify-center w-14 h-14 rounded-full"
                :style="{
                  background: `${card.menu.selected.theme || card.theme}40`,
                }"
              >
                <div
                  class="relative flex items-center justify-center w-10 h-10 rounded-full"
                  :style="{
                    background: card.menu.selected.theme || card.theme,
                  }"
                >
                  <component :is="card.menu.selected.icon" class="relative z-10 w-6 h-6 text-white" />
                  <div
                    class="absolute top-0 left-0 w-full h-full rounded-full group-hover:animate-ping-once"
                    :style="{
                      background: card.menu.selected.theme || card.theme,
                    }"
                  />
                </div>
              </div>
            </div>
            <div>
              <div class="flex items-center gap-2 mb-3">
                <div class="text-sm font-semibold text-slate-500">
                  {{ card.menu.selected.label }}
                </div>
                <WarningIcon v-if="error[indexOfWidget]" class="w-5 h-5" />
              </div>
              <div
                v-if="error[indexOfWidget] || card.menu.selected.value === null || card.menu.selected.value === undefined"
                class="text-sm font-medium leading-[1.71] text-gray-500"
              >
                No data available
              </div>
              <div v-else class="text-xl font-semibold leading-[1.2] md:text-2xl md:leading-none">
                {{ card.menu.selected.value || 0 }}
              </div>
            </div>
          </div>
          <div class="relative">
            <button
              class="flex text-[#9296AA] transition-colors duration-300 hover:text-blue-500"
              @click="card.menu.showOptions = !card.menu.showOptions"
            >
              <DotsVerticalIcon class="w-6 h-6" />
            </button>
            <Transition name="fade-full">
              <div
                v-if="card.menu.showOptions"
                v-click-outside="() => (card.menu.showOptions = false)"
                class="grid grid-cols-1 gap-1 absolute z-10 -bottom-2 right-0 translate-y-full min-w-max bg-white rounded-lg shadow-m p-3"
              >
                <button
                  v-for="option in card.menu.options"
                  :key="option.label"
                  class="group/option flex items-center justify-between w-full px-2 py-2 text-left rounded-lg text-sm font-medium leading-[1.71429] transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
                  :class="[option.label === card.menu.selected.label ? '' : 'text-neutral-700']"
                  @click="
                    card.menu.selected = option;
                    card.menu.showOptions = false;
                    getWidgedData(card, indexOfWidget);
                  "
                >
                  <span class="mr-4">
                    {{ option.label }}
                  </span>
                  <div
                    class="flex items-center justify-center w-[18px] h-[18px] rounded-full border-2 transition-colors duration-300"
                    :class="[
                      option.label === card.menu.selected.label ? 'border-blue-500' : 'border-border group-hover/option:border-dark',
                    ]"
                  >
                    <div v-if="option.label === card.menu.selected.label" class="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                  </div>
                </button>
              </div>
            </Transition>
          </div>
        </template>
      </div>
      <div class="flex items-center justify-between">
        <div v-if="card.menu.selected.noDropdownLabel" class="text-sm font-medium leading-[1.43] text-slate-500">
          {{ card.menu.selected.noDropdownLabel }}
        </div>
        <div v-else class="relative">
          <button class="flex items-center" @click="card.range.showOptions = !card.range.showOptions">
            <span class="text-sm left-[1.43] text-slate-500 font-medium mr-1">
              {{ card.range.selected.label }}
            </span>
            <ChevronIcon
              class="w-5 h-5 text-slate-500 transition-transform duration-300"
              :class="[card.range.showOptions ? 'rotate-180' : '']"
            />
          </button>
          <Transition name="fade-full">
            <div
              v-if="card.range.showOptions"
              v-click-outside="() => (card.range.showOptions = false)"
              class="absolute z-10 -bottom-2 left-0 translate-y-full grid grid-cols-1 gap-1 rounded-lg bg-white p-3 w-[200px]"
              :style="{
                boxShadow: '0px 0px 6px rgba(51, 51, 51, 0.2)',
              }"
            >
              <button
                v-for="(option, index) in options"
                :key="index"
                class="flex items-center w-full text-left px-3 py-2 rounded-lg transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
                :class="card.range.selected.value === option.value ? 'bg-[#F2F2F2] text-blue-500' : ''"
                @click="
                  card.range.showOptions = false;
                  card.range.selected = option;
                  getWidgedData(card, indexOfWidget);
                "
              >
                <span class="text-sm leading-[1.71] font-medium">{{ option.label }}</span>
              </button>
            </div>
          </Transition>
        </div>
        <button disabled class="flex items-center text-slate-500 mr-2 disabled:cursor-not-allowed disabled:opacity-60">
          <span class="text-sm font-medium left-[1.43] mr-2"> More </span>
          <ArrowRightIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { isRef, type Component, type Ref } from 'vue';
import { differenceInDays, startOfISOWeek } from 'date-fns';
import RevenueGrowthIcon from '@/assets/icons/dashboard/orders/revenue-growth.svg';
import TotalOrdersIcon from '@/assets/icons/dashboard/orders/total-orders.svg';
import TotalStockValueIcon from '@/assets/icons/dashboard/orders/total-stock-value.svg';
import GrossMarginIcon from '@/assets/icons/dashboard/orders/gross-margin.svg';
import GrossRevenueIcon from '@/assets/icons/dashboard/orders/gross-revenue.svg';
import ActiveCartSessionsIcon from '@/assets/icons/dashboard/orders/active-cart-sessions.svg';
import AvgOrderValueIcon from '@/assets/icons/dashboard/orders/avg-order-value.svg';
import RefundsIcon from '@/assets/icons/dashboard/orders/refunds.svg';
import ReturnsIcon from '@/assets/icons/dashboard/orders/returns.svg';
import ProductsSoldIcon from '@/assets/icons/dashboard/orders/products-sold.svg';
import DotsVerticalIcon from '@/assets/icons/dots-vertical.svg';
import ArrowRightIcon from '@/assets/icons/dashboard/arrow-right.svg';
import ChevronIcon from '@/assets/icons/dashboard/chevron-down.svg';
import WarningIcon from '@/assets/icons/dashboard/warning.svg';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';
import { WidgetTypeEnum } from '~/types/dashboard/orders';
import { fetchWidget } from '~/composables/api/orders';

type WidgetApiType = Parameters<typeof fetchWidget>[0];
type WidgetLabel = keyof typeof WidgetTypeEnum;

interface RangeOption {
  label: string;
  value: number;
}

interface WidgetMenuOption {
  label: WidgetLabel;
  icon: Component;
  value: string | Ref<string>;
  noDropdownLabel?: string;
  theme?: string;
}

interface WidgetCard {
  range: {
    selected: RangeOption;
    showOptions: boolean;
  };
  menu: {
    options: WidgetMenuOption[];
    selected: WidgetMenuOption;
    showOptions: boolean;
  };
  theme: string;
}

interface WidgetResponse {
  status: string;
  data: {
    total: string | number;
  };
}

const { $apiClient } = useNuxtApp();
const start = startOfISOWeek(Date.now());
const thisWeekDifference = differenceInDays(Date.now(), start);

const options = [
  { label: 'Last 24h', value: 1 },
  { label: 'This Week', value: thisWeekDifference },
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'All Time', value: -1 },
];

const setWidgetValueFormat = async (widgetType: string, response: string | number) => {
  if (
    widgetType === 'gross-revenue' ||
    widgetType === 'gross-margin' ||
    widgetType === 'total-stock-value' ||
    widgetType === 'revenue-growth' ||
    widgetType === 'average-order-value'
  ) {
    response =
      Number(response).toLocaleString('en', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' Lei';
  } else {
    response = Number(response).toLocaleString('en');
  }
  return response;
};

const error = ref([false, false, false, false]);
const isLoading = ref([true, true, true, true]);

const totalOrders = ref('');
const grossRevenue = ref('');
const avgOrderValue = ref('');
const productsSold = ref('');

const getTotalOrders = async () => {
  const firstWidget = (await fetchWidget('total-orders' as WidgetApiType, thisWeekDifference, $apiClient)) as WidgetResponse;
  if (firstWidget.status !== 'success') {
    isLoading.value[0] = false;
    error.value[0] = true;
    return;
  } else {
    isLoading.value[0] = false;
  }
  totalOrders.value = await setWidgetValueFormat('total-orders', firstWidget.data.total);
};
const getGrossRevenue = async () => {
  const secondWidget = (await fetchWidget('gross-revenue' as WidgetApiType, thisWeekDifference, $apiClient)) as WidgetResponse;
  if (secondWidget.status !== 'success') {
    isLoading.value[1] = false;
    error.value[1] = true;
    return;
  } else {
    isLoading.value[1] = false;
  }
  grossRevenue.value = await setWidgetValueFormat('gross-revenue', secondWidget.data.total);
};
const getAvgOrderValue = async () => {
  const thirdWidget = (await fetchWidget('average-order-value' as WidgetApiType, thisWeekDifference, $apiClient)) as WidgetResponse;
  if (thirdWidget.status !== 'success') {
    isLoading.value[2] = false;
    error.value[2] = true;
    return;
  } else {
    isLoading.value[2] = false;
  }
  avgOrderValue.value = await setWidgetValueFormat('average-order-value', thirdWidget.data.total);
};
const getProductsSold = async () => {
  const fourthWidget = (await fetchWidget('products-sold' as WidgetApiType, thisWeekDifference, $apiClient)) as WidgetResponse;
  if (fourthWidget.status !== 'success') {
    isLoading.value[3] = false;
    error.value[3] = true;
    return;
  } else {
    isLoading.value[3] = false;
  }
  productsSold.value = await setWidgetValueFormat('products-sold', fourthWidget.data.total);
};

if (import.meta.client) {
  getTotalOrders();
  getGrossRevenue();
  getAvgOrderValue();
  getProductsSold();
}

const cards = ref<WidgetCard[]>([
  {
    range: {
      selected: { label: 'This Week', value: thisWeekDifference },
      showOptions: false,
    },
    menu: {
      options: [
        {
          label: 'Total Orders',
          icon: TotalOrdersIcon,
          value: '',
        },
        {
          label: 'Revenue Growth',
          icon: RevenueGrowthIcon,
          value: '',
        },
      ],
      selected: {
        label: 'Total Orders',
        icon: TotalOrdersIcon,
        value: totalOrders,
        noDropdownLabel: '',
      },
      showOptions: false,
    },
    theme: '#007FFF',
  },
  {
    range: {
      selected: { label: 'This Week', value: thisWeekDifference },
      showOptions: false,
    },
    menu: {
      options: [
        {
          label: 'Gross Revenue',
          icon: GrossRevenueIcon,
          value: '',
        },
        {
          label: 'Gross Margin',
          icon: GrossMarginIcon,
          value: '',
        },
        {
          label: 'Total Stock Value',
          icon: TotalStockValueIcon,
          value: '',
          noDropdownLabel: 'Total shop stock value',
        },
      ],
      selected: {
        label: 'Gross Revenue',
        icon: GrossRevenueIcon,
        value: grossRevenue,
        noDropdownLabel: '',
      },
      showOptions: false,
    },
    theme: '#00D395',
  },
  {
    range: {
      selected: { label: 'This week', value: thisWeekDifference },
      showOptions: false,
    },
    menu: {
      options: [
        {
          label: 'Average Order Value',
          icon: AvgOrderValueIcon,
          value: '',
        },
        {
          label: 'Active Cart Sessions',
          icon: ActiveCartSessionsIcon,
          value: '',
          noDropdownLabel: 'Total open cart sessions',
        },
      ],
      selected: {
        label: 'Average Order Value',
        icon: AvgOrderValueIcon,
        value: avgOrderValue,
        noDropdownLabel: '',
      },
      showOptions: false,
    },
    theme: '#FFB100',
  },
  {
    range: {
      selected: { label: 'This week', value: thisWeekDifference },
      showOptions: false,
    },
    menu: {
      options: [
        {
          label: 'Products Sold',
          icon: ProductsSoldIcon,
          theme: '#A460BC',
          value: '',
        },
        {
          label: 'Returns',
          icon: ReturnsIcon,
          theme: '#FA4B4B',
          value: '',
        },
        {
          label: 'Refunds',
          icon: RefundsIcon,
          theme: '#FA4B4B',
          value: '',
        },
      ],
      selected: {
        label: 'Products Sold',
        icon: ProductsSoldIcon,
        theme: '#A460BC',
        value: productsSold,
        noDropdownLabel: '',
      },
      showOptions: false,
    },
    theme: '#A460BC',
  },
]);

const getWidgedData = async (data: WidgetCard, index: number) => {
  const type = WidgetTypeEnum[data.menu.selected.label];
  const range = type !== 'active-cart-sessions' && type !== 'total-stock-value' ? data.range.selected.value : -1;
  const response = (await fetchWidget(type as unknown as WidgetApiType, range, $apiClient)) as WidgetResponse;
  if (response.status !== 'success') {
    return;
  }
  const formattedTotal = await setWidgetValueFormat(type, response.data.total);
  const selectedValue = cards.value[index].menu.selected.value;
  if (isRef(selectedValue)) {
    selectedValue.value = formattedTotal;
  } else {
    cards.value[index].menu.selected.value = formattedTotal;
  }
};
</script>
