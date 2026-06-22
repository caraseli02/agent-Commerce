<template>
  <div class="w-[1488px] max-w-full p-4 mx-auto transition-all duration-300 md:py-6 2xl:px-6">
    <DashboardBreadcrumbs title="Customers" class="max-sm:hidden">
      <button disabled class="flex items-center rounded-lg bg-gray-100 px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60">
        <span class="leading-normal text-slate-500 font-medium mr-2"> Download </span>
        <DownloadIcon class="w-6 h-6 text-slate-500" />
      </button>
    </DashboardBreadcrumbs>
    <div
      class="grid grid-cols-1 gap-4 md:grid-cols-[1fr,325px] md:gap-6 lg:grid-cols-[1fr,398px] lg:grid-rows-[repeat(3,auto)] xl:grid-cols-[1fr,320px,300px] 2xl:grid-cols-[1fr,358px,358px]"
    >
      <DashboardCustomersByCountry class="row-start-1 md:col-span-2 xl:col-span-1 xl:row-span-2" />
      <DashboardCustomersTotal class="md:row-start-2 md:col-start-1 xl:col-start-2 xl:row-start-1" />
      <DashboardReturningCustomers class="md:row-start-3 md:col-start-1 xl:col-start-2 xl:row-start-2" />
      <DashboardNewCustomers class="md:row-start-2 md:row-span-2 md:col-start-2 xl:col-start-3 xl:row-start-1 xl:row-span-2" />
      <!--            <DashboardCustomersList class="md:col-span-2 xl:col-span-3" /> -->
      <AdminTableCustomer class="md:col-span-2 xl:col-span-3" />
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Dashboard',
});

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});
</script>
