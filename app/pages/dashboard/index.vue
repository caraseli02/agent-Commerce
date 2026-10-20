<template>
  <div class="w-[1488px] max-w-full p-4 mx-auto transition-all duration-300 md:py-6 2xl:px-6">
    <DashboardBreadcrumbs title="Customers" class="max-sm:hidden">
      <UiButton
        variant="secondary"
        disabled
        class="flex h-auto items-center rounded-lg text-base px-6 py-3 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span class="leading-normal text-muted-foreground font-medium mr-2"> Download </span>
        <DownloadIcon class="w-6 h-6 text-muted-foreground" />
      </UiButton>
    </DashboardBreadcrumbs>
    <div
      class="grid grid-cols-1 gap-4 md:grid-cols-[1fr_325px] md:gap-6 lg:grid-cols-[1fr_398px] lg:grid-rows-[repeat(3,auto)] xl:grid-cols-[1fr_320px_300px] 2xl:grid-cols-[1fr_358px_358px]"
    >
      <LazyDashboardCustomersByCountry class="row-start-1 md:col-span-2 xl:col-span-1 xl:row-span-2" />
      <LazyDashboardCustomersTotal class="md:row-start-2 md:col-start-1 xl:col-start-2 xl:row-start-1" />
      <LazyDashboardReturningCustomers class="md:row-start-3 md:col-start-1 xl:col-start-2 xl:row-start-2" />
      <LazyDashboardNewCustomers class="md:row-start-2 md:row-span-2 md:col-start-2 xl:col-start-3 xl:row-start-1 xl:row-span-2" />
      <!--            <DashboardCustomersList class="md:col-span-2 xl:col-span-3" /> -->
      <AdminTableCustomer class="md:col-span-2 xl:col-span-3" />
    </div>
  </div>
</template>

<script setup lang="ts">
import DownloadIcon from '@/assets/icons/dashboard/download.svg';

useHead({
  title: 'Dashboard',
});

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});
</script>
