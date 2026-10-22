<template>
  <div class="w-[1488px] max-w-full p-4 mx-auto md:py-6 2xl:px-6">
    <DashboardBreadcrumbs title="Products" section="Products" section-to="/dashboard/products" />
    <AdminTableProduct />
  </div>
</template>

<script setup lang="ts">
usePageSeo({ title: 'Products', robots: 'noindex,nofollow' });

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});
</script>
