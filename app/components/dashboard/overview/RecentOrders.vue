<template>
  <section class="flex flex-col rounded-xl bg-card p-4 shadow-xs md:p-6" aria-labelledby="recent-orders-title">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 id="recent-orders-title" class="font-semibold leading-normal">Recent orders</h2>
      <NuxtLink
        to="/dashboard/orders"
        class="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
        aria-label="View all orders"
      >
        View all
      </NuxtLink>
    </div>
    <ul v-if="loading" class="grid gap-3" aria-busy="true" aria-label="Loading recent orders">
      <li v-for="n in 5" :key="n"><UiSkeleton class="h-12 w-full" /></li>
    </ul>
    <p v-else-if="error" class="py-8 text-center text-sm text-muted-foreground">Recent orders couldn't load. Try refreshing the page.</p>
    <p v-else-if="orders.length === 0" class="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
    <ul v-else class="divide-y divide-border">
      <li v-for="order in orders" :key="order._id">
        <NuxtLink
          :to="`/dashboard/orders/${order._id}`"
          class="flex min-h-14 items-center justify-between gap-4 py-2 hover:bg-muted"
          :aria-label="`Order ${formatOrderRef(order.shortId)}`"
        >
          <span class="min-w-0">
            <span class="block truncate text-sm font-medium text-foreground">{{ formatOrderRef(order.shortId) }}</span>
            <span class="block truncate text-xs text-muted-foreground">{{ customerName(order) }}</span>
          </span>
          <span class="flex shrink-0 items-center gap-4">
            <DataTableStatusWithColor :status="order.status" :options="statusColors" class="max-sm:hidden" />
            <span class="text-sm font-medium tabular-nums text-foreground">{{ orderTotalLei(order.total) }}</span>
          </span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { statusColors } from '~/components/admin-table/order/options';
import { orderTotalLei, orderUserInfo } from '~/components/client-table/order/cellValues';
import { fetchOrders } from '~/composables/api/orders';
import type { OrderTableColumns } from '~~/types';
import { formatOrderRef } from '~/utils/numbers';

const orders = ref<OrderTableColumns[]>([]);
const loading = ref(true);
const error = ref(false);

const customerName = (order: OrderTableColumns) => orderUserInfo(order).name;

const loadOrders = async () => {
  const result = await fetchOrders(1, 5).catch(() => null);
  if (!result || result.status !== 'success') {
    error.value = true;
  } else {
    orders.value = result.data.items;
  }
  loading.value = false;
};

if (import.meta.client) {
  loadOrders();
}
</script>
