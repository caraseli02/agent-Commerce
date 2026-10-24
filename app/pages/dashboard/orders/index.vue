<template>
  <div class="w-[1488px] max-w-full p-4 mx-auto md:py-6 2xl:px-6">
    <DashboardOrdersBreadcrumbs title="Orders">
      <UiButton
        variant="secondary"
        disabled
        aria-label="Download All"
        class="flex h-auto items-center rounded-lg text-base p-2 md:px-6 md:py-2.5 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
      >
        <DownloadIcon class="w-7 h-7 text-muted-foreground md:w-6 md:h-6" />
        <span class="leading-normal text-muted-foreground font-medium ml-2 max-md:hidden"> Download All </span>
      </UiButton>
    </DashboardOrdersBreadcrumbs>
    <DashboardOrdersInfoCards />
    <!--        <DashboardOrdersList /> -->
    <AdminTableOrder />
  </div>
</template>

<script setup lang="ts">
import DownloadIcon from '@/assets/icons/dashboard/download.svg';

usePageSeo({ title: 'Orders', robots: 'noindex,nofollow' });

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});
</script>
