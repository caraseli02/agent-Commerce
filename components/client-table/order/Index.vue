<script setup lang="ts">
import { columns } from './columns';
import type { OrderInterface, OrderTableColumns } from '~/types';
import { fetchOrders } from '~/composables/api/orders';

interface OrdersListResponse {
  status: string;
  data: {
    total_items: number;
    page_count: number;
    items: OrderInterface[];
  };
}

const props = defineProps({
  userId: {
    type: String,
  },
});

const emit = defineEmits<{
  showTotalItems: [val: number];
}>();

const { $apiClient } = useNuxtApp();
const totalItems = ref(0);
const pageCount = ref(0);
const loading = ref(true);
const error = ref(false);
const listItems = ref<OrderTableColumns[]>([]);

const fetchAndSetOrdersList = async (
  page: number,
  perPage: number,
  filters: Record<string, unknown> = {},
  sort: Record<string, unknown> = {}
) => {
  error.value = false;

  if (props.userId) {
    filters.userId = props.userId;
  }

  const data = (await fetchOrders(page, perPage, filters, sort, $apiClient)) as OrdersListResponse;

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
  listItems.value = data.data.items as unknown as OrderInterface[];
  loading.value = false;
  emit('showTotalItems', data.data.total_items);
};

const debouncedFetchAndSetOrdersList = fetchAndSetOrdersList;

await fetchAndSetOrdersList(1, 10);
</script>

<template>
  <div class="h-full flex-1 flex-col space-y-8 flex w-[358px] md:w-[736px] lg:w-[976px] xl:w-[1392px] shadow-xs p-2 pt-6 md:p-6 rounded-xl">
    <DataTable
      v-if="!loading"
      :fetch-fn="debouncedFetchAndSetOrdersList"
      :page-count="pageCount"
      :data="listItems"
      :columns="columns"
      :loading="loading"
      :total-items="totalItems"
    >
      <template #header="{ table, makeRefresh }">
        <DataTableHeadControls :error="error" title="Orders List" :table="table" @refresh="makeRefresh()">
          <!-- <UiButton class="flex-1 md:flex-grow-0 flex gap-2" size="sm">
                      <PlusIcon class="h-6 w-6" />
                      Create New
                    </UiButton> -->
        </DataTableHeadControls>
      </template>
      <template #toolbar="{ table }">
        <ClientTableOrderToolbar :table="table" />
      </template>
    </DataTable>
  </div>
</template>
