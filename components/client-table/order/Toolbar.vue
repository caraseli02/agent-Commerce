<script setup lang="ts" generic="TData">
import type { Table } from '@tanstack/vue-table';
import { XIcon } from 'lucide-vue-next';
import { orderType, statusColors } from './options';
import { OrderTableColumnsEnum } from '~/components/client-table/order/columns.enum';

interface DataTableToolbarProps {
    table: Table<TData>;
}

type StringFacetedFilterOption = {
    label: string | null;
    value: string;
    badge?: { bg: string; text?: string };
};

const props = defineProps<DataTableToolbarProps>();

const isFiltered = computed(() => props.table.getState().columnFilters.length > 0);
const orderTypeOptions = orderType as unknown as StringFacetedFilterOption[];
</script>

<template>
    <div class="flex items-center justify-between">
        <div class="flex flex-wrap gap-2 flex-1 items-center space-x-2">
            <UiInput
                placeholder="Filter orders..."
                :model-value="(table.getColumn(OrderTableColumnsEnum.SHORT_ID)?.getFilterValue() as string) ?? ''"
                class="h-9 w-full md:w-[150px] lg:w-[250px]"
                @input="table.getColumn(OrderTableColumnsEnum.SHORT_ID)?.setFilterValue($event.target.value)"
            />
            <DataTableFilterFaceted
                v-if="table.getColumn(OrderTableColumnsEnum.TYPE)"
                :column="table.getColumn(OrderTableColumnsEnum.TYPE)"
                title="Type"
                :options="orderTypeOptions"
            />
            <DataTableFilterInput
                v-if="table.getColumn(OrderTableColumnsEnum.USER_NAME)"
                :column="table.getColumn(OrderTableColumnsEnum.USER_NAME)"
                title="Name"
            />
            <DataTableFilterDate title="Date" :column="table.getColumn(OrderTableColumnsEnum.CREATED_AT)" />
            <DataTableFilterFaceted
                v-if="table.getColumn(OrderTableColumnsEnum.STATUS)"
                :column="table.getColumn(OrderTableColumnsEnum.STATUS)"
                title="Status"
                :status-colors="statusColors"
            />
            <DataTableFilterRange
                v-if="table.getColumn(OrderTableColumnsEnum.TOTAL)"
                :column="table.getColumn(OrderTableColumnsEnum.TOTAL)"
                title="Total"
                prefix="Lei"
            />
            <UiButton
                v-if="isFiltered"
                variant="ghost"
                class="h-8 px-2 lg:px-3 flex items-center text-neutral-700"
                @click="table.resetColumnFilters()"
            >
                Reset
                <XIcon class="ml-2 h-4 w-4" />
            </UiButton>
        </div>
        <!-- <DataTableViewOptions :table="table" /> -->
    </div>
</template>
