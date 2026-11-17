<template>
  <div data-testid="operator-inventory-page" class="w-[1488px] max-w-full p-4 mx-auto md:py-6 2xl:px-6">
    <DashboardBreadcrumbs title="Inventory" section="Inventory" section-to="/dashboard/operator/inventory" />

    <div
      v-if="isLoading"
      data-testid="operator-inventory-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
      class="rounded-xl border border-border bg-card p-6 space-y-3"
    >
      <p class="text-sm text-muted-foreground">Loading stock levels…</p>
      <UiSkeleton v-for="row in 4" :key="row" class="h-10 w-full rounded-lg" />
    </div>

    <div
      v-else-if="errorMessage"
      data-testid="operator-inventory-error"
      role="alert"
      class="rounded-xl border border-border bg-card p-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p class="text-sm font-medium text-foreground">Stock levels could not be loaded.</p>
        <p class="text-xs text-muted-foreground mt-1">{{ errorMessage }}</p>
      </div>
      <UiButton variant="outline" data-testid="operator-inventory-retry" @click="loadInventory">Try again</UiButton>
    </div>

    <div v-else data-testid="operator-inventory-table" class="rounded-xl border border-border bg-card overflow-x-auto">
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>ID</UiTableHead>
            <UiTableHead>SKU</UiTableHead>
            <UiTableHead>Product</UiTableHead>
            <UiTableHead class="text-right">On hand</UiTableHead>
            <UiTableHead class="text-right">Held</UiTableHead>
            <UiTableHead class="text-right">Available</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <UiTableEmpty v-if="!rows.length" :colspan="6">No catalog products found.</UiTableEmpty>
          <UiTableRow v-for="row in rows" :key="row.productId" :data-testid="`operator-inventory-row-${row.productId}`">
            <UiTableCell>{{ row.productId }}</UiTableCell>
            <UiTableCell>{{ row.sku }}</UiTableCell>
            <UiTableCell>{{ row.name }}</UiTableCell>
            <UiTableCell :data-testid="`operator-inventory-on-hand-${row.productId}`" class="text-right">
              {{ row.state === 'tracked' ? row.onHand : 'Untracked' }}
            </UiTableCell>
            <UiTableCell :data-testid="`operator-inventory-held-${row.productId}`" class="text-right">
              {{ row.state === 'tracked' ? row.effectiveHeld : '—' }}
            </UiTableCell>
            <UiTableCell :data-testid="`operator-inventory-available-${row.productId}`" class="text-right">
              {{ row.state === 'tracked' ? row.available : 'Untracked' }}
            </UiTableCell>
          </UiTableRow>
        </UiTableBody>
      </UiTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from '~/components/ui/toast';
import { fetchOperatorInventory } from '~/composables/api/operator';
import type { OperatorInventoryRow } from '~~/types/inventory';

usePageSeo({ title: 'Inventory', robots: 'noindex,nofollow' });

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});

const rows = ref<OperatorInventoryRow[]>([]);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);

const loadInventory = async () => {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const response = await fetchOperatorInventory();
    rows.value = response.data ?? [];
  } catch (error) {
    rows.value = [];
    const status =
      (error as { statusCode?: number; response?: { status?: number } })?.statusCode ??
      (error as { response?: { status?: number } })?.response?.status;
    if (status === 403) {
      toast({ title: 'Access restricted', description: 'Your account cannot open that page, so we brought you back home.' });
      await navigateTo('/');
      return;
    }
    errorMessage.value = 'Check your connection and try again.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  void loadInventory();
});
</script>
