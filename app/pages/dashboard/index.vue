<template>
  <div class="w-[1488px] max-w-full p-4 mx-auto md:py-6 2xl:px-6">
    <h1 class="mb-6 text-xl leading-[1.4] text-foreground font-semibold">Overview</h1>
    <DashboardOrdersInfoCards />
    <div class="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-[1fr_360px]">
      <DashboardOverviewRecentOrders />
      <LazyDashboardNewCustomers />
    </div>
  </div>
</template>

<script setup lang="ts">
usePageSeo({ title: 'Overview', robots: 'noindex,nofollow' });

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});
</script>
