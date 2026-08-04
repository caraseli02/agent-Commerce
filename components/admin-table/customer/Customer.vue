<script setup lang="ts">
import { columns } from './columns';
import { fetchCustomersList } from '~/composables/api/dashboard-admin';
import type { CustomerTableColumns } from '~/types/auth/user-interface';

const totalItems = ref(0);
const pageCount = ref(0);
const loading = ref(true);
const error = ref(false);
const listItems = ref<CustomerTableColumns[]>([]);

const fetchAndSetCustomersList = _debounce(
  async (page: number, perPage: number, filters: Record<string, unknown> = {}, sort: Record<string, unknown> = {}) => {
    error.value = false;
    loading.value = true;

    // FIX to use userID

    const data = await fetchCustomersList(page, perPage, filters, sort);

    if (!data || data.status !== 'success') {
      loading.value = false;
      error.value = true;
      totalItems.value = 0;
      pageCount.value = 0;
      listItems.value = [];
      return;
    }

    totalItems.value = data.data.total_items;
    pageCount.value = data.data.page_count;
    listItems.value = data.data.items;
    loading.value = false;
  },
  500
);

fetchAndSetCustomersList(1, 10);
</script>

<template>
  <div class="h-full flex-1 flex-col space-y-8 flex w-full max-w-full min-w-0 2xl:w-[1444px] shadow-xs p-2 pt-6 md:p-6 rounded-xl bg-white">
    <DataTable
      :fetch-fn="fetchAndSetCustomersList"
      :page-count="pageCount"
      :data="listItems"
      :columns="columns"
      :loading="loading"
      :total-items="totalItems"
    >
      <template #header="{ table, makeRefresh }">
        <DataTableHeadControls :error="error" title="Customers List" :table="table" @refresh="makeRefresh()">
          <!-- <UiButton class="flex-1 md:flex-grow-0 flex gap-2" size="sm">
                      <PlusIcon class="h-6 w-6" />
                      Create New
                    </UiButton> -->
        </DataTableHeadControls>
      </template>
      <template #toolbar="{ table }">
        <AdminTableCustomerToolbar :table="table" />
      </template>
    </DataTable>
  </div>
</template>
