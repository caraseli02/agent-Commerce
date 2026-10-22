<template>
  <section
    class="w-full overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 md:p-8 dark:border-emerald-800/60 dark:bg-emerald-950/40"
  >
    <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-2xl space-y-4">
        <div
          class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-800/60 dark:text-emerald-200"
        >
          <CheckCircle class="h-4 w-4" />
          Order confirmed
        </div>

        <div class="space-y-3">
          <h4 class="text-2xl font-semibold tracking-tight text-foreground md:text-4xl">Thanks — your order is in.</h4>
          <p class="max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
            We’ve locked the order and the full breakdown is ready below. Use this page as your reference for totals, delivery details, and
            payment status.
          </p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:min-w-[320px] lg:max-w-[360px] lg:grid-cols-1">
        <div class="rounded-xl border border-white/80 bg-card/90 p-4 shadow-sm dark:border-border">
          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Order reference</p>
          <p class="mt-2 text-lg font-semibold text-foreground">
            {{ orderId || 'Generated at confirmation' }}
          </p>
        </div>

        <div class="rounded-xl border border-white/80 bg-card/90 p-4 shadow-sm dark:border-border">
          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Next update</p>
          <p class="mt-2 text-sm font-medium text-foreground">
            {{ pickupDate ? `Estimated pickup ${pickupDate}` : 'Shipping and payment updates will appear here as they are processed.' }}
          </p>
        </div>
      </div>
    </div>

    <div class="mt-6 grid gap-3 md:grid-cols-3">
      <div class="rounded-xl border border-border bg-card px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Contact</p>
        <p class="mt-1 text-sm font-medium text-foreground">
          {{ email || 'Account email on file' }}
        </p>
      </div>

      <div class="rounded-xl border border-border bg-card px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Delivery</p>
        <p class="mt-1 text-sm font-medium text-foreground">
          {{ shippingMethod || 'Selected at checkout' }}
        </p>
      </div>

      <div class="rounded-xl border border-border bg-card px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">What now</p>
        <p class="mt-1 text-sm font-medium text-foreground">Review the live order details below.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { CheckCircle } from '@lucide/vue';

interface Props {
  orderId?: string;
  email?: string;
  shippingMethod?: string;
  pickupDate?: string;
}

withDefaults(defineProps<Props>(), {
  orderId: '',
  email: '',
  shippingMethod: '',
  pickupDate: '',
});
</script>
