<template>
  <div class="w-[1488px] max-w-full p-4 mx-auto md:py-6 2xl:px-6">
    <DashboardBreadcrumbs title="Customers">
      <UiButton
        variant="secondary"
        disabled
        class="flex h-auto items-center rounded-lg text-base px-6 py-3 max-sm:hidden disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span class="leading-normal text-muted-foreground font-medium mr-2"> Download </span>
        <DownloadIcon class="w-6 h-6 text-muted-foreground" />
      </UiButton>
    </DashboardBreadcrumbs>
    <div
      class="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_300px] md:gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[repeat(3,auto)] xl:grid-cols-[minmax(0,1fr)_280px_280px] 2xl:grid-cols-[minmax(0,1fr)_300px_300px]"
    >
      <LazyDashboardCustomersByCountry class="row-start-1 md:col-span-2 xl:col-span-1 xl:row-span-2" />
      <LazyDashboardCustomersTotal class="md:row-start-2 md:col-start-1 xl:col-start-2 xl:row-start-1" />
      <LazyDashboardReturningCustomers class="md:row-start-3 md:col-start-1 xl:col-start-2 xl:row-start-2" />
      <LazyDashboardNewCustomers class="md:row-start-2 md:row-span-2 md:col-start-2 xl:col-start-3 xl:row-start-1 xl:row-span-2" />
      <AdminTableCustomer class="md:col-span-2 xl:col-span-3" />
    </div>
  </div>
</template>

<script setup lang="ts">
import DownloadIcon from '@/assets/icons/dashboard/download.svg';

usePageSeo({ title: 'Customers', robots: 'noindex,nofollow' });

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});
</script>
