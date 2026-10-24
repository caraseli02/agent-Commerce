<template>
  <section aria-label="Order metrics" class="mb-6 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
    <DashboardKpiCard
      v-for="card in cards"
      :key="card.label"
      :label="card.label"
      :value="card.value"
      :icon="card.icon"
      :loading="card.loading"
      :error="card.error"
      note="All time"
    />
  </section>
</template>

<script setup lang="ts">
import { markRaw, reactive, type Component } from 'vue';
import { BanknoteIcon, PackageIcon, ReceiptIcon, ShoppingBagIcon } from '@lucide/vue';
import { fetchOrders, fetchWidget } from '~/composables/api/orders';
import type { WidgetApiType } from '~~/types/dashboard/admin-orders';
import { formatLei } from '~/utils/numbers';

interface KpiState {
  label: string;
  icon: Component;
  value: string | null;
  loading: boolean;
  error: boolean;
}

const cards = reactive<KpiState[]>([
  { label: 'Total orders', icon: markRaw(ShoppingBagIcon), value: null, loading: true, error: false },
  { label: 'Gross revenue', icon: markRaw(BanknoteIcon), value: null, loading: true, error: false },
  { label: 'Average order value', icon: markRaw(ReceiptIcon), value: null, loading: true, error: false },
  { label: 'Products sold', icon: markRaw(PackageIcon), value: null, loading: true, error: false },
]);

const settle = (card: KpiState, value: string | null) => {
  card.loading = false;
  card.error = value === null;
  card.value = value;
};

// Total orders reads the same list endpoint as the order tabs, so both counts always agree.
const loadTotalOrders = async (card: KpiState) => {
  const result = await fetchOrders(1, 1).catch(() => null);
  settle(card, result && result.status === 'success' ? Number(result.data.total_items).toLocaleString('en') : null);
};

const loadWidget = async (card: KpiState, type: WidgetApiType, format: (total: number) => string) => {
  const result = await fetchWidget(type, -1).catch(() => null);
  settle(card, result && result.status === 'success' ? format(Number(result.data.total)) : null);
};

const [totalOrders, grossRevenue, averageOrderValue, productsSold] = cards as [KpiState, KpiState, KpiState, KpiState];

if (import.meta.client) {
  loadTotalOrders(totalOrders);
  loadWidget(grossRevenue, 'gross-revenue', formatLei);
  loadWidget(averageOrderValue, 'average-order-value', formatLei);
  loadWidget(productsSold, 'products-sold', (total) => total.toLocaleString('en'));
}
</script>
