<script setup lang="ts">
import { subHours } from 'date-fns';
import type { Table } from '@tanstack/vue-table';
import { columns } from './columns';
import { OrderStatus } from '~~/types';
import type { OrderInterface, OrderTableColumns } from '~~/types';
import { OrderTableColumnsEnum } from '~/components/client-table/order/columns.enum';
import { fetchOrders } from '~/composables/api/orders';

interface TabFilter {
  label: string;
  value?: string;
  key?: OrderStatus[] | string[];
  total_items: number;
  items?: OrderInterface[];
}

const totalItems = ref(0);
const pageCount = ref(0);
const loading = ref(true);
const loadingFilters = ref(true);
const error = ref(false);
const listItems = ref<OrderTableColumns[]>([]);

const fetchAndSetOrdersList = async (
  page: number,
  perPage: number,
  filters: Record<string, unknown> = {},
  sort: Record<string, unknown> = {},
) => {
  error.value = false;

  const result = await fetchOrders(page, perPage, filters, sort);

  if (!result || result.status !== 'success') {
    loading.value = false;
    error.value = true;
    totalItems.value = 0;
    pageCount.value = 0;
    listItems.value = [];
    return;
  }

  totalItems.value = result.data.total_items;
  pageCount.value = result.data.page_count;
  listItems.value = result.data.items;
  loading.value = false;
  return result.data;
};

// Tab labels reuse the vocabulary of the Status column so a tab count matches the rows it filters.
const orderFilters = ref<TabFilter[]>([
  {
    label: 'All orders',
    total_items: 0,
  },
  {
    label: 'Last 24h',
    value: OrderTableColumnsEnum.CREATED_AT,
    key: [subHours(new Date(), 24).toISOString()],
    total_items: 0,
  },
  {
    label: 'In progress',
    value: 'status',
    key: [OrderStatus.Pending, OrderStatus.Processing, OrderStatus.OnHold, OrderStatus.Packaging],
    total_items: 0,
  },
  {
    label: 'Dispatched',
    value: 'status',
    key: [OrderStatus.Dispatched],
    total_items: 0,
  },
  {
    label: 'Delivered',
    value: 'status',
    key: [OrderStatus.Delivered],
    total_items: 0,
  },
  {
    label: 'Completed',
    value: 'status',
    key: [OrderStatus.Completed],
    total_items: 0,
  },
  {
    label: 'Canceled',
    value: 'status',
    key: [OrderStatus.Canceled],
    total_items: 0,
  },
] as TabFilter[]);

const activeOrderFilter = ref<TabFilter>(orderFilters.value[0] ?? { label: 'All', total_items: 0 });

const getServerFiltersByTab = (filter: TabFilter) => {
  const filterObj = {} as Record<string, string>;
  const filterKeys = Array.isArray(filter?.key) ? filter.key : filter?.key ? [filter.key] : [];

  if (!filter?.value || !filterKeys.length) {
    return filterObj;
  }

  if (filter.value === 'startDate' || filter.value === OrderTableColumnsEnum.CREATED_AT) {
    filterObj.startDate = String(filterKeys[0] || '');
    return filterObj;
  }

  filterObj[filter.value] = filterKeys.map((key) => String(key)).join(',');

  return filterObj;
};

const loadTabFilters = async () => {
  loadingFilters.value = true;
  await Promise.all(
    orderFilters.value.map(async (filter) => {
      const result = await fetchOrders(1, 1, getServerFiltersByTab(filter)).catch(() => null);
      filter.total_items = result?.status === 'success' ? result.data.total_items : 0;
    }),
  );
  loadingFilters.value = false;
  await fetchAndSetOrdersList(1, 10);
};

const onTabChange = async (filter: TabFilter, table: Table<OrderTableColumns>) => {
  activeOrderFilter.value = filter;
  table.resetColumnFilters();
  if (filter.value) {
    table.getColumn(filter.value)?.setFilterValue(filter.key);
  }
  await fetchAndSetOrdersList(1, 10, getServerFiltersByTab(filter), {});
};

const debouncedFetchAndSetOrdersList = fetchAndSetOrdersList;

onMounted(() => {
  loadTabFilters();
});
</script>

<template>
  <div
    class="relative h-full flex-1 flex-col space-y-8 flex w-full max-w-full min-w-0 md:w-[640px] lg:w-[896px] xl:w-[1312px] 2xl:w-[1444px] shadow-xs p-2 pt-6 md:p-6 rounded-xl bg-card"
  >
    <DataTable
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
        <AdminTableOrderToolbar :table="table" />
      </template>
      <template #tabs="{ table }">
        <SharedScrollableRegion class="mb-6" label="Order filters" test-id="order-filter-tabs">
          <div class="flex items-center gap-2" role="group" aria-label="Filter orders by status">
            <UiButton
              v-for="filter in orderFilters"
              :key="filter.label"
              :variant="filter.label === activeOrderFilter.label ? 'secondary' : 'ghost'"
              :aria-pressed="filter.label === activeOrderFilter.label"
              class="flex-shrink-0 min-h-11"
              @click="onTabChange(filter, table)"
            >
              <span>
                {{ filter.label }}
              </span>
              <UiSkeleton v-if="loadingFilters" class="ml-2 h-5 min-w-[32px]" />
              <span
                v-else
                class="ml-2 px-2 rounded-[25px] text-xs leading-[1.66] font-medium min-w-[32px] transition-colors duration-200"
                :class="filter.label === activeOrderFilter.label ? 'text-primary-foreground bg-primary' : 'text-muted-foreground bg-muted'"
              >
                {{ filter.total_items || '0' }}
              </span>
            </UiButton>
          </div>
        </SharedScrollableRegion>
      </template>
    </DataTable>
  </div>
</template>
