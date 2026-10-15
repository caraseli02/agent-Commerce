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
  activeOrderFilter.value.total_items = totalItems.value;
  return result.data;
};

const orderFilters = ref<TabFilter[]>([
  {
    label: 'All orders',
    total_items: 0,
  },
  {
    label: 'Active',
    value: 'status',
    key: [OrderStatus.Completed, OrderStatus.Canceled],
    total_items: 0,
  },
  {
    label: 'Last 24h',
    value: OrderTableColumnsEnum.CREATED_AT,
    key: [subHours(new Date(), 24).toISOString()],
    total_items: 0,
  },
  {
    label: 'Awaiting Processing',
    value: 'status',
    key: [
      'Verification Required',
      OrderStatus.Processing,
      OrderStatus.Pending,
      'Awaiting Fulfillment',
      'Awaiting Shipment',
      'Awaiting Pickup',
      'Awaiting Payment',
    ],
    total_items: 0,
  },
  {
    label: 'Fulfilled',
    value: 'status',
    key: ['Shipped', 'Partially Shipped'],
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
const filterHighlightWidth = ref(0);
const filterHightlightLeft = ref(0);

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
  for (const filter of orderFilters.value) {
    const filterObj = getServerFiltersByTab(filter);
    const data = await fetchAndSetOrdersList(pageCount.value, 10, filterObj, {});
    filter.total_items = data?.total_items ?? 0;
  }
  setTimeout(() => {
    loadingFilters.value = false;
  }, 500);
  fetchAndSetOrdersList(1, 10);
};

const setActiveFilterHighlight = () => {
  const activeFilter = activeOrderFilter.value;
  const index = orderFilters.value.findIndex((filter) => filter.label === activeFilter.label);

  if (index !== -1) {
    const filterElement = document.querySelectorAll('.ordersFilter')[index] as HTMLElement;

    if (filterElement) {
      filterHighlightWidth.value = filterElement.clientWidth;
      filterHightlightLeft.value = filterElement.offsetLeft;
    }
  }
};

watch(
  activeOrderFilter,
  async () => {
    setActiveFilterHighlight();
  },
  { deep: true },
);

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
  setTimeout(() => {
    setActiveFilterHighlight();
    loading.value = false;
  }, 1000);
});
</script>

<template>
  <div
    class="relative h-full flex-1 flex-col space-y-8 flex w-full max-w-full min-w-0 md:w-[640px] lg:w-[896px] xl:w-[1312px] 2xl:w-[1444px] shadow-xs p-2 pt-6 md:p-6 rounded-xl bg-white"
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
          <div class="relative flex items-center gap-4 rounded-xl pl-2 md:gap-8">
            <UiButton
              v-for="(filter, index) in orderFilters"
              :key="index"
              variant="link"
              class="ordersFilter relative z-10 h-auto flex-shrink-0 gap-3 px-0 py-5 leading-[1.71] md:py-8"
              :class="[filter.label === activeOrderFilter.label ? 'text-blue-500' : '']"
              @click="onTabChange(filter, table)"
            >
              <span>
                {{ filter.label }}
              </span>
              <span
                class="px-2 rounded-[25px] text-xs leading-[1.66] font-medium min-w-[32px] transition-colors duration-300"
                :class="filter.label === activeOrderFilter.label ? 'text-white bg-blue-500' : 'text-slate-500 bg-gray-100'"
              >
                {{ filter.total_items || '0' }}
              </span>
            </UiButton>
            <div
              class="absolute bottom-0 bg-blue-500 h-1 rounded-t-lg transition-all duration-300"
              :style="{
                width: filterHighlightWidth + 'px',
                left: filterHightlightLeft + 'px',
              }"
            />
          </div>
        </SharedScrollableRegion>
      </template>
    </DataTable>
    <UiSkeleton v-if="loadingFilters" class="w-full h-full absolute inset-0 top-24 z-20 animate-none" />
  </div>
</template>
