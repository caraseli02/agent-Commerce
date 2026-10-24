<template>
  <ClientOnly>
    <section class="flex flex-col justify-center mb-16">
      <div class="w-full max-w-[1392px] mx-auto px-4 py-4 md:py-6 lg:px-6 xl:px-8 xl:pt-8">
        <h1 class="mb-4 text-xl leading-[1.4] text-foreground font-semibold md:mb-6">My account</h1>
        <div class="grid w-full grid-cols-1 gap-4 md:gap-6">
          <section class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-[1fr_1fr_minmax(0,514px)]">
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
            <!-- Row 1: account info, recent purchases, credit and support. Row 2: addresses and card. -->
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <DashboardClientInfo
                :id="myAccountInformation?._id ?? ''"
                :account-information="myAccountInformation"
                class="md:col-span-2 lg:col-span-1"
              />
              <DashboardClientRecentlyBought :data="myRecentlyBougth" />
              <div class="flex flex-col gap-4 md:col-span-2 md:gap-6 lg:col-span-1">
                <DashboardClientCredit
                  :available-credit="myAccountInformation.adminSettings?.customerCredit?.available || 0"
                  :balance="myAccountInformation.adminSettings?.customerCredit?.limit || 0"
                />
                <DashboardClientSupport />
              </div>
              <DashboardClientRecentlyBoughtSlider class="md:col-span-2" />
              <DashboardClientAddressCards v-if="myAddresses.length > 0" :addresses="myAddresses" />
              <DashboardClientPaymentCard :card="myCard" />
            </div>
          </template>
        </div>
      </div>
      <DashboardClientViewHistory :view-history="myViewHistory" />
    </section>
    <template #fallback>
      <section class="flex flex-col justify-center mb-16">
        <div
          class="w-full max-w-[1392px] mx-auto px-4 py-4 md:py-6 lg:px-6 xl:px-8 xl:pt-8"
          aria-busy="true"
          aria-label="Loading dashboard"
        >
          <UiSkeleton class="mb-4 h-7 w-40 md:mb-6" />
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
            <UiSkeleton v-for="n in 3" :key="n" class="h-40 w-full rounded-xl" />
          </div>
          <UiSkeleton class="mt-6 h-96 w-full rounded-xl" />
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

usePageSeo({ title: 'My account', robots: 'noindex,nofollow' });

const route = useRoute();
const initialTab = typeof route.query.tab === 'string' ? route.query.tab : '';
if (initialTab) {
  activeOrderFilter.value = {
    ...activeOrderFilter.value,
    value: initialTab,
  };
}

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
