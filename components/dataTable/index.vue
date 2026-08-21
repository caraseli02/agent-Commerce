<script setup lang="ts" generic="TData, TValue">
import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/vue-table';
import { FlexRender, getCoreRowModel, useVueTable } from '@tanstack/vue-table';
import { watchDebounced } from '@vueuse/core';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';
import { useVirtualTableRows } from '~/composables/useVirtualTableRows';
import { transformFiltersToObject, transformSortingKeys, valueUpdater } from '~/lib/utils';

interface Props {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  fetchFn: (page: number, perPage: number, filters?: Record<string, unknown>, sort?: Record<string, unknown>) => unknown;
  pageCount: number;
  totalItems: number;
  loading: boolean;
  showScrollHint?: boolean;
  scrollHint?: string;
  tableMinWidth?: string;
}

const props = defineProps<Props>();

const sorting = ref<SortingState>([]);
const columnFilters = ref<ColumnFiltersState>([]);
const columnVisibility = ref<VisibilityState>({});
const rowSelection = ref({});

const table = useVueTable({
  get data() {
    return props.data;
  },
  get columns() {
    return props.columns;
  },
  state: {
    get sorting() {
      return sorting.value;
    },
    get columnFilters() {
      return columnFilters.value;
    },
    get columnVisibility() {
      return columnVisibility.value;
    },
    get rowSelection() {
      return rowSelection.value;
    },
  },
  enableRowSelection: true,
  // For Server Request
  manualPagination: true,
  manualSorting: true,
  pageCount: props.pageCount,
  // For Server Request
  onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, sorting),
  onColumnFiltersChange: (updaterOrValue) => valueUpdater(updaterOrValue, columnFilters),
  onColumnVisibilityChange: (updaterOrValue) => valueUpdater(updaterOrValue, columnVisibility),
  onRowSelectionChange: (updaterOrValue) => valueUpdater(updaterOrValue, rowSelection),
  getCoreRowModel: getCoreRowModel(),
  // getFilteredRowModel: getFilteredRowModel(),
  // getSortedRowModel: getSortedRowModel(),
  // getFacetedRowModel: getFacetedRowModel(),
  // getFacetedUniqueValues: getFacetedUniqueValues(),
});

watch(
  () => [table.getState().pagination.pageIndex, table.getState().pagination.pageSize, table.getState().sorting],
  (oldVal, newVal) => {
    const { pageIndex, pageSize } = table.getState().pagination;
    if (_isEqual(oldVal, newVal)) return;

    const rightIndex = pageIndex + 1;
    props.fetchFn(
      rightIndex,
      pageSize,
      transformFiltersToObject(table.getState().columnFilters),
      transformSortingKeys(table.getState().sorting[0]),
    );
  },
);

const refresh = ref(false);
watch(refresh, async () => {
  if (!refresh.value) return;
  const { pageIndex, pageSize } = table.getState().pagination;
  const rightIndex = pageIndex + 1;
  await props.fetchFn(
    rightIndex,
    pageSize,
    transformFiltersToObject(table.getState().columnFilters),
    transformSortingKeys(table.getState().sorting[0]),
  );
  setTimeout(() => {
    refresh.value = false;
  }, 500);
});

watchDebounced(
  () => table.getState().columnFilters,
  () => {
    const { pageSize } = table.getState().pagination;
    table.setPageIndex(0);
    props.fetchFn(1, pageSize, transformFiltersToObject(table.getState().columnFilters), transformSortingKeys(table.getState().sorting[0]));
  },
  { debounce: 500, maxWait: 1000 },
);

// watch(
//   () => props.pageCount,
//   async () => {
//     await nextTick();
//     table.setOptions({ ...table.options, pageCount: props.pageCount });
//   }, {deep: true}
// );

// watch(() => props.rowCount, () => {
//   console.log('reset');

//   table.reset()
// }, {deep: true})

// eslint-disable-next-line vue/no-async-in-computed-properties
const loadingSize = computed(async () => {
  // const size = 60 * 10;
  const size = 60 * Number(table.getState().pagination.pageSize);
  // eslint-disable-next-line vue/no-async-in-computed-properties
  await nextTick();
  return `${size}px`;
});

const scrollContainerRef = ref<HTMLElement | null>(null);
const tableRows = computed(() => table.getRowModel().rows);
const { virtualRows, paddingTop, paddingBottom } = useVirtualTableRows(tableRows, scrollContainerRef);
const leafColumnCount = computed(() => table.getAllLeafColumns().length);
</script>

<template>
  <div class="space-y-4 mt-5 font-Poppins text-neutral-700 relative">
    <slot name="tabs" :table="table" />
    <slot name="header" :make-refresh="() => (refresh = true)" :table="table" />
    <slot name="toolbar" :table="table" />
    <div class="rounded-xl border relative min-h-[650px]">
      <SharedScrollableRegion
        class="min-h-[650px]"
        label="Data table"
        test-id="dashboard-data-table"
        :show-scroll-hint="showScrollHint"
        :scroll-hint="scrollHint"
        scroll-target-selector="[data-testid='virtualized-table-scroll']"
      >
        <div ref="scrollContainerRef" class="max-h-[600px] overflow-y-auto" data-testid="virtualized-table-scroll">
          <UiTable :table-style="tableMinWidth ? { minWidth: tableMinWidth } : undefined">
            <UiTableHeader class="sticky top-0 z-10 bg-light-200">
              <UiTableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                <UiTableHead v-for="header in headerGroup.headers" :key="header.id">
                  <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
                </UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody class="relative min-h-[600px]" data-testid="virtualized-table-body">
              <template v-if="tableRows.length">
                <tr v-if="paddingTop > 0" aria-hidden="true">
                  <td :colspan="leafColumnCount" class="p-0 border-0" :style="{ height: `${paddingTop}px` }" />
                </tr>
                <UiTableRow
                  v-for="virtualRow in virtualRows"
                  :key="tableRows[virtualRow.index].id"
                  class="hover:bg-light-200"
                  :data-state="tableRows[virtualRow.index].getIsSelected() && 'selected'"
                  :data-index="virtualRow.index"
                >
                  <UiTableCell v-for="cell in tableRows[virtualRow.index].getVisibleCells()" :key="cell.id">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </UiTableCell>
                </UiTableRow>
                <tr v-if="paddingBottom > 0" aria-hidden="true">
                  <td :colspan="leafColumnCount" class="p-0 border-0" :style="{ height: `${paddingBottom}px` }" />
                </tr>
              </template>

              <div v-else class="w-full min-h-[600px]">
                <section class="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <EmojiSadIcon class="w-[52px] h-[52px] mb-4" />
                  <div class="w-full">No results.</div>
                </section>
              </div>
            </UiTableBody>
          </UiTable>
        </div>
      </SharedScrollableRegion>
      <UiSkeleton v-if="refresh || loading" :style="{ height: loadingSize }" class="w-full rounded absolute inset-0 top-[49px] z-10" />
    </div>
    <DataTablePagination :total-items="totalItems" :page-count="props.pageCount" :table="table" />
  </div>
</template>
