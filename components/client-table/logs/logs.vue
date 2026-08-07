<script setup lang="ts">
import { columns } from './columns';
import type { LogsItem } from '~/components/client-table/logs/columns.enum';
import { useControlPanel } from '~/composables/useControlPanel';

const { fetchActivityLogs } = useControlPanel();

const emit = defineEmits<{
  showTotalItems: [val: number];
}>();

interface PaginatedActivityLogsResponse {
  status: string;
  data: {
    total_items: number;
    page_count: number;
    page: number;
    items: LogsItem[];
  };
}

const totalItems = ref(0);
const pageCount = ref(0);
const loading = ref(true);
const error = ref(false);
const listItems = ref<LogsItem[]>([]);

const fetchAndSetActivityLogs = async (
  page: number,
  perPage: number,
  filters: Record<string, unknown> = {},
  sort: Record<string, unknown> = {}
) => {
  error.value = false;

  const data = (await fetchActivityLogs(page, perPage, filters, sort)) as PaginatedActivityLogsResponse | null;

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
  emit('showTotalItems', data.data.total_items);
};

const debouncedFetchAndSetActivityLogs = _debounce(fetchAndSetActivityLogs, 500);

await fetchAndSetActivityLogs(1, 10);
</script>

<template>
  <div
    class="h-full flex-1 flex-col space-y-8 flex min-h-[870px] w-[358px] md:w-[736px] lg:w-[976px] xl:w-[1392px] shadow-xs p-2 pt-6 md:p-6 rounded-xl"
  >
    <DataTable
      v-if="!loading"
      :fetch-fn="debouncedFetchAndSetActivityLogs"
      :page-count="pageCount"
      :data="listItems"
      :columns="columns"
      :loading="loading"
      :total-items="totalItems"
    >
      <template #header="{ table, makeRefresh }">
        <DataTableHeadControls :error="error" title="Activity Log" :table="table" @refresh="makeRefresh()">
          <!-- <UiButton class="flex-1 md:flex-grow-0 flex gap-2" size="sm">
<PlusIcon class="h-6 w-6" />
Create New
</UiButton> -->
        </DataTableHeadControls>
      </template>
      <template #toolbar="{ table }">
        <ClientTableLogsToolbar :table="table" />
      </template>
    </DataTable>
    <!-- <UiSkeleton v-else class="w-full h-full" /> -->
  </div>
</template>
