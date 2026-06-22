<template>
  <section
    class="w-full overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 md:p-8"
  >
    <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div class="max-w-2xl space-y-4">
        <div
          class="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
        >
          <CheckCircle class="h-4 w-4" />
          Order confirmed
        </div>

        <div class="space-y-3">
          <h4 class="text-2xl font-semibold tracking-tight text-slate-900 md:text-4xl">Thanks — your order is in.</h4>
          <p class="max-w-xl text-sm leading-6 text-slate-600 md:text-base">
            We’ve locked the order and the full breakdown is ready below. Use this page as your reference for totals, delivery details, and
            payment status.
          </p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:min-w-[320px] lg:max-w-[360px] lg:grid-cols-1">
        <div class="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Order reference</p>
          <p class="mt-2 text-lg font-semibold text-slate-900">
            {{ orderId || 'Generated at confirmation' }}
          </p>
        </div>

        <div class="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Next update</p>
          <p class="mt-2 text-sm font-medium text-slate-900">
            {{ pickupDate ? `Estimated pickup ${pickupDate}` : 'Shipping and payment updates will appear here as they are processed.' }}
          </p>
        </div>
      </div>
    </div>

    <div class="mt-6 grid gap-3 md:grid-cols-3">
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Contact</p>
        <p class="mt-1 text-sm font-medium text-slate-900">
          {{ email || 'Account email on file' }}
        </p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Delivery</p>
        <p class="mt-1 text-sm font-medium text-slate-900">
          {{ shippingMethod || 'Selected at checkout' }}
        </p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">What now</p>
        <p class="mt-1 text-sm font-medium text-slate-900">Review the live order details below.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { CheckCircle } from 'lucide-vue-next';

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
