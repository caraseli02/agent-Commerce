<template>
  <ClientOnly>
    <section class="flex flex-col justify-center mb-16">
      <div class="max-w-full p-4 mx-auto transition-all duration-300 !pb-0 md:py-6 lg:px-6 xl:p-0 xl:pt-8">
        <div class="grid grid-cols-1 gap-4 md:gap-6 w-[358px] md:w-[736px] lg:w-[976px] xl:w-[1392px]">
          <section class="flex justify-between gap-6 flex-wrap xl:flex-nowrap">
            <DashboardClientActiveOrders :items="ordersIds" />
            <DashboardClientOutstandingInvoices :items="ordersIds" />
            <DashboardClientBanner :slides="hotSales" />
          </section>
          <DashboardClientTabBar v-model="activeOrderFilter" />
          <LazyClientTableOrder v-if="activeOrderFilter.value === 'orders'" @show-total-items="activeOrderFilter.total_items = $event" />
          <LazyClientTableTransaction
            v-if="activeOrderFilter.value === 'transaction_history'"
            class="shadow-xs p-2 pt-6 md:p-6 rounded-xl"
            @show-total-items="activeOrderFilter.total_items = $event"
          />
          <LazyClientTableAgents v-if="activeOrderFilter.value === 'agents'" @show-total-items="activeOrderFilter.total_items = $event" />
          <LazyClientTableLogs
            v-if="activeOrderFilter.value === 'activity_logs'"
            @show-total-items="activeOrderFilter.total_items = $event"
          />
          <LazyDashboardClientSettings v-if="activeOrderFilter.value === 'settings'" />
          <template v-if="activeOrderFilter.value === 'home'">
            <DashboardClientActivity :data="myActivityData" />
            <div class="flex flex-wrap gap-4 xl:grid-cols-3 xl:grid-rows-[repeat(2,auto)] md:gap-6">
              <DashboardClientInfo
                :id="myAccountInformation?._id ?? ''"
                :account-information="myAccountInformation"
                class="xl:col-start-1 xl:row-start-1 xl:row-span-2"
              />
              <DashboardClientRecentlyBought :data="myRecentlyBougth" />
              <DashboardClientRecentlyBoughtSlider />
              <section class="hidden xl:flex flex-col gap-6 min-w-[330px]">
                <DashboardClientCredit
                  :available-credit="myAccountInformation.adminSettings?.customerCredit?.available || 0"
                  :balance="myAccountInformation.adminSettings?.customerCredit?.limit || 0"
                />
                <DashboardClientSupport />
              </section>
              <div class="flex gap-6 w-full flex-wrap">
                <DashboardClientCredit
                  :available-credit="myAccountInformation.adminSettings?.customerCredit?.available || 0"
                  :balance="myAccountInformation.adminSettings?.customerCredit?.available || 0"
                  class="xl:hidden"
                />
                <DashboardClientAddressCards v-if="myAddresses.length > 0" :addresses="myAddresses" />
                <DashboardClientPaymentCard :card="myCard" />
                <DashboardClientSupport class="xl:hidden" />
              </div>
            </div>
          </template>
        </div>
      </div>
      <DashboardClientViewHistory :view-history="myViewHistory" />
    </section>
    <template #fallback>
      <section class="flex flex-col justify-center mb-16">
        <div class="max-w-full p-4 mx-auto md:py-6 lg:px-6 xl:p-0 xl:pt-8">
          <div class="bg-white rounded-xl shadow-xs p-6 text-sm text-slate-500">Loading dashboard...</div>
        </div>
      </section>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { useCustomerDashboard } from '@/composables/useCustomerDashboard';
import { useRoute } from '#app';

const {
  ordersIds,
  activeOrderFilter,
  myActivityData,
  myAccountInformation,
  myRecentlyBougth,
  myAddresses,
  myViewHistory,
  hotSales,
  myCard,
  activeOrders,
  activityWidgets,
  customerInformation,
  recentlyBougth,
  addresses,
  viewHistory,
  monthHotSale,
  getDefaultCard,
} = useCustomerDashboard();

const route = useRoute();
const initialTab = typeof route.query.tab === 'string' ? route.query.tab : '';
if (initialTab) {
  activeOrderFilter.value = {
    ...activeOrderFilter.value,
    value: initialTab,
  };
}

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});

customerInformation();

onMounted(async () => {
  activeOrders();
  addresses();
  activityWidgets();
  recentlyBougth();
  viewHistory();
  monthHotSale();
  getDefaultCard();
});
</script>
