<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
    <div class="flex items-start justify-between bg-card rounded-xl p-4 shadow-xs md:p-6">
      <div class="flex items-center">
        <div class="mr-4">
          <EmojiSadIcon v-if="emptyData || error.lastOrder" class="w-[52px] h-[52px]" />
          <div v-else class="flex items-center justify-center w-14 h-14 bg-blue-500/25 rounded-full">
            <div class="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full">
              <LastOrderIcon class="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div>
          <div class="text-sm font-semibold text-muted-foreground mb-3">Last Order</div>
          <SkeletonLoader v-if="isLoading.lastOrder" class="w-[160px] h-6 -mt-1" />
          <div v-else-if="emptyData || error.lastOrder || !lastOrder" class="text-sm font-medium leading-[1.714] text-muted-foreground">
            No data available
          </div>
          <div v-else-if="!emptyData && !error.lastOrder" class="text-xl font-semibold text-blue-500 leading-[1.2]">
            {{ `#${lastOrder?.shortId}` || '-' }}
          </div>
        </div>
      </div>
      <WarningIcon v-if="error.lastOrder" class="w-6 h-6" />
    </div>
    <div class="flex items-start justify-between bg-card rounded-xl p-4 shadow-xs md:p-6">
      <div class="flex items-center">
        <div class="mr-4">
          <EmojiSadIcon v-if="emptyData || error.totalSpent" class="w-[52px] h-[52px]" />
          <div v-else class="flex items-center justify-center w-14 h-14 bg-[#00D395] bg-opacity-25 rounded-full">
            <div class="flex items-center justify-center w-10 h-10 bg-[#00D395] rounded-full">
              <MoneyBagIcon class="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div>
          <div class="text-sm font-semibold text-muted-foreground mb-3">Total Spent</div>
          <SkeletonLoader v-if="isLoading.totalSpent" class="w-[160px] h-6 -mt-1" />
          <div v-else-if="emptyData || error.totalSpent" class="text-sm font-medium leading-[1.714] text-muted-foreground">
            No data available
          </div>
          <div v-else-if="!emptyData && !error.totalSpent" class="text-xl font-semibold leading-[1.2]">
            {{ totalSpent?.toFixed(2) || 0 }} Lei
          </div>
        </div>
      </div>
      <WarningIcon v-if="error.totalSpent" class="w-6 h-6" />
    </div>
    <div class="flex items-start justify-between bg-card rounded-xl p-4 shadow-xs md:p-6">
      <div class="flex items-center">
        <div class="mr-4">
          <EmojiSadIcon v-if="emptyData || error.avgOrderValue" class="w-[52px] h-[52px]" />
          <div v-else class="flex items-center justify-center w-14 h-14 bg-[#FFB100] bg-opacity-25 rounded-full">
            <div class="flex items-center justify-center w-10 h-10 bg-[#FFB100] rounded-full">
              <CardIcon class="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div>
          <div class="text-sm font-semibold text-muted-foreground mb-3">Average Order Value</div>
          <SkeletonLoader v-if="isLoading.avgOrderValue" class="w-[160px] h-6 -mt-1" />
          <div v-else-if="emptyData || error.avgOrderValue" class="text-sm font-medium leading-[1.714] text-muted-foreground">
            No data available
          </div>
          <div v-else-if="!emptyData && !error.avgOrderValue" class="text-xl font-semibold leading-[1.2]">
            {{ avgOrderValue?.toFixed(2) || 0 }}
          </div>
        </div>
      </div>
      <WarningIcon v-if="error.avgOrderValue" class="w-6 h-6" />
    </div>
    <div class="flex items-start justify-between bg-card rounded-xl p-4 shadow-xs md:p-6">
      <div class="flex items-center">
        <div class="mr-4">
          <EmojiSadIcon v-if="emptyData || error.abandonedCheckout" class="w-[52px] h-[52px]" />
          <div v-else class="flex items-center justify-center w-14 h-14 bg-rose-500 bg-opacity-25 rounded-full">
            <div class="flex items-center justify-center w-10 h-10 bg-rose-500 rounded-full">
              <AbandonedCheckoutIcon class="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
        <div>
          <div class="text-sm font-semibold text-muted-foreground mb-3">Abandoned Checkout</div>
          <SkeletonLoader v-if="isLoading.abandonedCheckout" class="w-[160px] h-6 -mt-1" />
          <div v-else-if="emptyData || error.abandonedCheckout" class="text-sm font-medium leading-[1.714] text-muted-foreground">
            No data available
          </div>
          <div v-else-if="!emptyData && !error.abandonedCheckout" class="text-xl font-semibold leading-[1.2]">
            {{ abandonedCheckout || 0 }}
          </div>
        </div>
      </div>
      <WarningIcon v-if="error.abandonedCheckout" class="w-6 h-6" />
    </div>
  </div>
</template>

<script setup lang="ts">
import LastOrderIcon from '@/assets/icons/dashboard/orders.svg';
import MoneyBagIcon from '@/assets/icons/dashboard/money-bag.svg';
import CardIcon from '@/assets/icons/dashboard/card.svg';
import AbandonedCheckoutIcon from '@/assets/icons/dashboard/abandoned-checkout.svg';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';
import WarningIcon from '@/assets/icons/dashboard/warning.svg';
import {
  fetchCustomerAbandonedCheckout,
  fetchCustomerAvgOrderValue,
  fetchCustomerLastOrder,
  fetchCustomerTotalSpent,
} from '~/composables/api/customer-profile';
import type { OrderInterface } from '~~/types';

const error = ref({
  lastOrder: false,
  totalSpent: false,
  avgOrderValue: false,
  abandonedCheckout: false,
});
const emptyData = ref(false);
const isLoading = ref({
  lastOrder: false,
  totalSpent: false,
  avgOrderValue: false,
  abandonedCheckout: false,
});
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
});

const lastOrder = ref<OrderInterface>({} as OrderInterface);
const totalSpent = ref(0);
const avgOrderValue = ref(0);
const abandonedCheckout = ref(0);

const fetchLastOrder = async () => {
  error.value.lastOrder = false;
  isLoading.value.lastOrder = true;
  if (!props.id) {
    return;
  }
  const response = (await fetchCustomerLastOrder(props.id)) as {
    status: string;
    data: OrderInterface;
  };

  if (response.status !== 'success') {
    isLoading.value.lastOrder = false;
    error.value.lastOrder = true;

    return;
  } else {
    isLoading.value.lastOrder = false;
  }

  lastOrder.value = response.data;
};

const fetchTotalSpent = async () => {
  error.value.totalSpent = false;
  isLoading.value.totalSpent = true;
  if (!props.id) {
    return;
  }
  const response = (await fetchCustomerTotalSpent(props.id)) as {
    status: string;
    data: number;
  };
  if (response.status !== 'success') {
    isLoading.value.totalSpent = false;
    error.value.totalSpent = true;
    return;
  } else {
    isLoading.value.totalSpent = false;
    totalSpent.value = Number(response.data);
  }
};

const fetchAvgOrderValue = async () => {
  error.value.avgOrderValue = false;
  isLoading.value.avgOrderValue = true;
  if (!props.id) {
    return;
  }
  const response = (await fetchCustomerAvgOrderValue(props.id)) as {
    status: string;
    data: number;
  };

  if (response.status !== 'success') {
    isLoading.value.avgOrderValue = false;
    error.value.avgOrderValue = true;

    return;
  } else {
    isLoading.value.avgOrderValue = false;
  }

  avgOrderValue.value = response.data;
};

const fetchAbandonedCheckout = async () => {
  error.value.abandonedCheckout = false;
  isLoading.value.abandonedCheckout = true;
  if (!props.id) {
    return;
  }
  const response = (await fetchCustomerAbandonedCheckout(props.id)) as {
    status: string;
    data: number;
  };

  if (response.status !== 'success') {
    isLoading.value.abandonedCheckout = false;
    error.value.abandonedCheckout = true;

    return;
  } else {
    isLoading.value.abandonedCheckout = false;
  }

  abandonedCheckout.value = response.data;
};

await Promise.all([fetchLastOrder(), fetchTotalSpent(), fetchAvgOrderValue(), fetchAbandonedCheckout()]);
</script>
