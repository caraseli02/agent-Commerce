<script setup lang="ts">
import { columns } from './columns';
import { fetchSearchProduct } from '~/composables/api/products';
import type { ProductInterface } from '~~/types/product';

const totalItems = ref(0);
const pageCount = ref(0);
const loading = ref(true);
const error = ref(false);
const listItems = ref<ProductInterface[]>([]);

const fetchAndSetProductsList = async (page: number, perPage: number, filters: Record<string, unknown> = {}, sort = {}) => {
  error.value = false;

  const keyword = typeof filters.name === 'string' ? filters.name : '';
  const result = await fetchSearchProduct(keyword, null, page, perPage, sort).catch(() => null);

  if (!result || result.status !== 'success') {
    loading.value = false;
    error.value = true;
    totalItems.value = 0;
    pageCount.value = 0;
    listItems.value = [];
    return;
  }

  const products = result.data.items;
  totalItems.value = products.total_items;
  pageCount.value = products.page_count;
  listItems.value = products.items as unknown as ProductInterface[];
  loading.value = false;
};

onMounted(() => {
  fetchAndSetProductsList(1, 10);
});
</script>

<template>
  <div class="relative h-full flex-1 flex-col space-y-8 flex w-full max-w-full min-w-0 shadow-xs p-2 pt-6 md:p-6 rounded-xl bg-card">
    <DataTable
      :fetch-fn="fetchAndSetProductsList"
      :page-count="pageCount"
      :data="listItems"
      :columns="columns"
      :loading="loading"
      :total-items="totalItems"
      empty-message="No products found."
    >
      <template #header="{ table, makeRefresh }">
        <DataTableHeadControls :error="error" title="Products List" :table="table" @refresh="makeRefresh()" />
      </template>
      <template #toolbar="{ table }">
        <div class="flex items-center">
          <UiInput
            placeholder="Filter products..."
            aria-label="Filter products"
            :model-value="(table.getColumn('name')?.getFilterValue() as string) ?? ''"
            class="h-9 w-full md:w-[250px]"
            @input="table.getColumn('name')?.setFilterValue(($event.target as HTMLInputElement).value)"
          />
        </div>
      </template>
    </DataTable>
  </div>
</template>
