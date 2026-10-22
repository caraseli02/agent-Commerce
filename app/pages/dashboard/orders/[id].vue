<script setup lang="ts">
import { ChevronLeft } from '@lucide/vue';

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});

const route = useRoute();
</script>

<template>
  <section class="max-w-full bg-muted">
    <div class="container font-Poppins lg:p-4 md:py-6 2xl:px-6">
      <DashboardOrdersBreadcrumbs class="px-2 pt-4" title="Order">
        <template #order>
          <span class="text-xs leading-[1.33] text-muted-foreground flex-shrink-0 mx-1">/</span>
          <span class="text-xs leading-[1.33] flex-shrink-0 font-medium text-primary transition-colors duration-200 hover:text-primary">
            #{{ route.params.id }}
          </span>
        </template>
        <section class="flex gap-3">
          <UiButton size="icon">
            <ChevronLeft class="w-5 h-5" />
          </UiButton>
          <UiButton variant="secondary" size="icon">
            <ChevronLeft class="w-5 h-5 rotate-180" />
          </UiButton>
        </section>
      </DashboardOrdersBreadcrumbs>
      <OrderConfirmAdminConfirmation :order-id="route.params.id" />
    </div>
  </section>
</template>
