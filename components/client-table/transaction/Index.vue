<script setup lang="ts">
import { columns } from './columns';
import type { TransactionInterface } from '~/types/dashboard/transaction';
import { fetchTransactions } from '~/composables/api/control-panel';

const props = defineProps({
  userId: {
    type: String,
  },
});

const emit = defineEmits<{
  showTotalItems: [val: number];
}>();

const totalItems = ref(0);
const pageCount = ref(0);
const loading = ref(true);
const error = ref(false);
const listItems = ref<TransactionInterface[]>([]);

const fetchAndSetTransactionListRaw = async (
  page: number,
  perPage: number,
  filters: Record<string, unknown> = {},
  sort: Record<string, unknown> = {}
) => {
  loading.value = true;
  error.value = false;

  try {
    if (props.userId) {
      filters.userId = props.userId;
    }

    const data = await fetchTransactions(page, perPage, filters, sort);

    if (!data || data.status !== 'success') {
      loading.value = false;
      error.value = true;
      totalItems.value = 0;
      pageCount.value = 0;
      listItems.value = [];
      return;
    }

    totalItems.value = data.data.total_items;

    listItems.value = data.data.items as TransactionInterface[];
    pageCount.value = data.data.page_count;
    emit('showTotalItems', data.data.total_items);

    loading.value = false;

    return data.data;
  } catch (err) {
    console.error('Failed to load transactions', err);
    loading.value = false;
    error.value = true;
    totalItems.value = 0;
    pageCount.value = 0;
    listItems.value = [];
    return;
  }
};

const fetchAndSetTransactionList = _debounce(fetchAndSetTransactionListRaw, 250);

await fetchAndSetTransactionListRaw(1, 10);
</script>

<template>
  <div class="h-full flex-1 flex-col space-y-8 flex w-[358px] md:w-[736px] lg:w-[976px] xl:w-[1392px]">
    <DataTable
      v-if="!loading"
      :fetch-fn="fetchAndSetTransactionList"
      :page-count="pageCount"
      :total-items="totalItems"
      :data="listItems"
      :columns="columns"
      :loading="loading"
    >
      <template #header="{ table, makeRefresh }">
        <DataTableHeadControls :error="error" title="Transaction History" :table="table" @refresh="makeRefresh()">
          <!-- <UiButton class="flex-1 md:flex-grow-0 flex gap-2" size="sm">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M2 11.9997H1.5H2ZM2 3.99967H2.5H2ZM4.66667 1.33301V0.833008V1.33301ZM11.3333 1.33301V0.833008V1.33301ZM14 3.99967H13.5H14ZM14 8.22844H14.5H14ZM7.5621 14.6663V14.1663V14.6663ZM4.66667 14.6663V15.1663V14.6663ZM13.219 10.1141L12.8654 9.7605H12.8654L13.219 10.1141ZM9.44771 13.8853L9.80127 14.2388L9.44771 13.8853ZM8.66667 11.9997H9.16667H8.66667ZM11.3333 9.33301V8.83301V9.33301ZM10.3536 6.35323C10.5488 6.15797 10.5488 5.84138 10.3536 5.64612C10.1583 5.45086 9.84171 5.45086 9.64645 5.64612L10.3536 6.35323ZM8.94281 7.05686L8.58926 6.70331L8.94281 7.05686ZM7.05719 7.05687L7.41075 6.70331H7.41075L7.05719 7.05687ZM6.35355 5.64612C6.15829 5.45086 5.84171 5.45086 5.64645 5.64612C5.45119 5.84138 5.45119 6.15797 5.64645 6.35323L6.35355 5.64612ZM7.5 7.33301C7.5 7.60915 7.72386 7.83301 8 7.83301C8.27614 7.83301 8.5 7.60915 8.5 7.33301H7.5ZM8.5 3.99967C8.5 3.72353 8.27614 3.49967 8 3.49967C7.72386 3.49967 7.5 3.72353 7.5 3.99967H8.5ZM2.5 11.9997L2.5 3.99967H1.5L1.5 11.9997H2.5ZM4.66667 1.83301L11.3333 1.83301V0.833008L4.66667 0.833008V1.83301ZM13.5 3.99967V8.22844H14.5V3.99967H13.5ZM7.5621 14.1663H4.66667V15.1663H7.5621V14.1663ZM12.8654 9.7605L9.09416 13.5317L9.80127 14.2388L13.5725 10.4676L12.8654 9.7605ZM7.5621 15.1663C8.40195 15.1663 9.2074 14.8327 9.80127 14.2388L9.09416 13.5317C8.68783 13.9381 8.13673 14.1663 7.5621 14.1663V15.1663ZM13.5 8.22844C13.5 8.80307 13.2717 9.35417 12.8654 9.7605L13.5725 10.4676C14.1664 9.87374 14.5 9.06829 14.5 8.22844H13.5ZM2.5 3.99967C2.5 2.80306 3.47005 1.83301 4.66667 1.83301V0.833008C2.91777 0.833008 1.5 2.25077 1.5 3.99967H2.5ZM1.5 11.9997C1.5 13.7486 2.91776 15.1663 4.66667 15.1663V14.1663C3.47005 14.1663 2.5 13.1963 2.5 11.9997H1.5ZM11.3333 1.83301C12.53 1.83301 13.5 2.80306 13.5 3.99967H14.5C14.5 2.25077 13.0822 0.833008 11.3333 0.833008V1.83301ZM9.16667 14.6663L9.16667 11.9997H8.16667L8.16667 14.6663L9.16667 14.6663ZM11.3333 9.83301L14 9.83301L14 8.83301L11.3333 8.83301V9.83301ZM9.16667 11.9997C9.16667 10.8031 10.1367 9.83301 11.3333 9.83301V8.83301C9.58443 8.83301 8.16667 10.2508 8.16667 11.9997H9.16667ZM9.64645 5.64612L8.58926 6.70331L9.29636 7.41042L10.3536 6.35323L9.64645 5.64612ZM7.41075 6.70331L6.35355 5.64612L5.64645 6.35323L6.70364 7.41042L7.41075 6.70331ZM8.5 7.33301V3.99967H7.5V7.33301H8.5ZM8.58926 6.70331C8.26382 7.02875 7.73618 7.02875 7.41075 6.70331L6.70364 7.41042C7.4196 8.12638 8.5804 8.12638 9.29636 7.41042L8.58926 6.70331Z"
                          fill="white" />
                      </svg>

                      Download All
                    </UiButton> -->
        </DataTableHeadControls>
      </template>
      <template #toolbar="{ table }">
        <ClientTableTransactionToolbar :table="table" />
      </template>
    </DataTable>
  </div>
</template>
