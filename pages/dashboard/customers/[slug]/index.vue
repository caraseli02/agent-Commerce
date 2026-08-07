<template>
  <div class="w-[1488px] max-w-full p-4 mx-auto transition-all duration-300 md:py-6 2xl:px-6">
    <DashboardBreadcrumbs :key="String(updateBreadcrumbs)" title="Customer Profile" :customer="customerSlug" :customer-name="customerName">
      <div class="max-lg:hidden max-w-max">
        <div class="grid grid-cols-[repeat(2,auto)] gap-5 text-right">
          <div class="flex flex-col">
            <div class="text-sm leading-relaxed font-medium text-slate-500 mb-3">Credit Limit</div>
            <div v-if="!isLoading" class="font-semibold leading-tight">
              <div v-if="emptyData || error || !credit" class="text-sm font-medium leading-tight text-gray-500">No data available</div>
              <div v-else>{{ credit.limit }} Lei</div>
            </div>
            <SkeletonLoader v-else class="w-[104px] h-5" />
          </div>
          <div
            class="relative pl-5 before:absolute before:top-1/2 before:-translate-y-1/2 before:left-0 before:w-px before:h-[85%] before:bg-border before:rounded-[50px]"
          >
            <div class="text-sm leading-relaxed font-medium text-slate-500 mb-3">Available Credit</div>
            <div v-if="!isLoading" class="font-semibold leading-tight text-blue-500">
              <div v-if="emptyData || error || !credit" class="text-sm font-medium leading-tight text-gray-500">No data available</div>
              <div v-else>{{ credit.available }} Lei</div>
            </div>
            <SkeletonLoader v-else class="w-[104px] h-5" />
          </div>
        </div>
      </div>
    </DashboardBreadcrumbs>
    <div class="grid grid-cols-1 gap-4 md:gap-6">
      <div class="bg-white rounded-xl px-4 py-3 shadow-xs grid grid-cols-2 md:py-2 lg:hidden">
        <div class="pr-4 md:flex md:items-center md:py-2">
          <SkeletonLoader v-if="isLoading" class="w-full h-[45px] md:h-5" />
          <template v-else>
            <div
              class="flex items-center justify-between text-xs leading-relaxed font-medium text-slate-500 mb-2 md:m-0 md:text-sm md:mr-2"
            >
              <div>Credit Limit</div>
              <WarningIcon v-if="error" class="w-5 h-5 md:hidden" />
            </div>
            <div v-if="emptyData || error || !credit" class="text-sm font-medium leading-tight text-gray-500">No data available</div>
            <div v-else class="text-sm font-semibold leading-tight">{{ credit.limit }} Lei</div>
            <WarningIcon v-if="error" class="w-5 h-5 ml-auto max-md:hidden" />
          </template>
        </div>
        <div
          class="relative pl-4 before:absolute before:top-0 before:left-0 before:w-px before:h-full before:bg-gray-100 before:rounded-[50px] md:flex md:items-center"
        >
          <SkeletonLoader v-if="isLoading" class="w-full h-[45px] md:h-5" />
          <template v-else>
            <div
              class="flex items-center justify-between text-xs leading-relaxed font-medium text-slate-500 mb-2 md:m-0 md:text-sm md:mr-2"
            >
              <div>Available Credit</div>
              <WarningIcon v-if="error" class="w-5 h-5 md:hidden" />
            </div>
            <div v-if="emptyData || error || !credit" class="text-sm font-medium leading-tight text-gray-500">No data available</div>
            <div v-else class="text-sm font-semibold leading-tight text-blue-500">{{ credit.available }} Lei</div>
            <WarningIcon v-if="error" class="w-5 h-5 ml-auto max-md:hidden" />
          </template>
        </div>
      </div>
      <LazyDashboardCustomersInfoCards :id="customerSlug" />
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:grid-rows-[repeat(2,auto)] md:gap-6">
        <LazyDashboardCustomersCustomerInformation :id="customerSlug" class="xl:col-start-1 xl:row-start-1 xl:row-span-2" />
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:col-start-2 xl:row-start-1">
          <LazyDashboardCustomersNetMargin />
          <LazyDashboardCustomersRecentTransactions :id="customerSlug" />
        </div>
        <LazyDashboardCustomersDefaultShippingAddress :id="customerSlug" class="xl:col-start-2 xl:row-start-2" />
      </div>
      <LazyClientTableOrder :user-id="customerSlug" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Emitter from 'tiny-emitter/instance.js';
import WarningIcon from '@/assets/icons/dashboard/warning.svg';
import type { CustomerCreditInterface } from '~/types/auth/account-settings';
import { customerCreditHelper } from '~/helpers/customer-credit.helper';
import { useControlPanel } from '~/composables/useControlPanel';

const { fetchCustomerCredit } = useControlPanel();

const customerName = ref('');
const updateBreadcrumbs = ref(false);

useHead({
  title: 'Dashboard Profile',
});

Emitter.on('customer-info', async (object: { name: string }) => {
  customerName.value = object.name;
  updateBreadcrumbs.value = !updateBreadcrumbs.value;
});

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});

const error = ref(false);
const emptyData = ref(false);
const isLoading = ref(true);
const config = useRuntimeConfig();
const isMockMode = computed(() => Boolean(config.public.MOCK_MODE));

const route = useRoute();
const customerSlug = computed(() => String(route.params.slug ?? ''));
const credit = ref({} as { limit: string; spent: string; available: string });

const getCustomerCredit = async () => {
  if (!customerSlug.value) {
    return;
  }
  try {
    const response = (await fetchCustomerCredit(customerSlug.value)) as {
      status: string;
      data: CustomerCreditInterface;
    };

    if (response.status !== 'success' || !response.data) {
      error.value = true;
      emptyData.value = true;
      setTimeout(() => {
        isLoading.value = false;
      }, 500);
      return;
    }

    credit.value = customerCreditHelper(response.data);
    error.value = false;
    emptyData.value = false;
    setTimeout(() => {
      isLoading.value = false;
    }, 500);
  } catch (caughtError) {
    console.error('Failed to load customer credit', caughtError);
    if (isMockMode.value) {
      credit.value = customerCreditHelper({
        limit: 12000,
        spent: 3200,
        available: 8800,
        dueDate: new Date().toISOString(),
        tillDue: '30',
        term: 30,
        freeze: false,
        active: true,
      });
      error.value = false;
      emptyData.value = false;
      setTimeout(() => {
        isLoading.value = false;
      }, 500);
      return;
    }

    error.value = true;
    emptyData.value = true;
    setTimeout(() => {
      isLoading.value = false;
    }, 500);
  }
};

await getCustomerCredit();

onMounted(async () => {
  setTimeout(() => {
    isLoading.value = false;
  }, 5000);
});
</script>
