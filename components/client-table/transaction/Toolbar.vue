<script setup lang="ts" generic="TData">
import type { Table } from '@tanstack/vue-table';
import { XIcon } from 'lucide-vue-next';
import { paymentStatusOptions, paymentTypeOptions } from '~/components/client-table/transaction/options';
import { TransactionTableColumnsEnum } from '~/components/client-table/transaction/columns.enum';

interface DataTableToolbarProps {
    table: Table<TData>;
}

type StringFacetedFilterOption = {
    label: string | null;
    value: string;
    color?: string;
    badge?: { bg: string; text?: string };
};

const props = defineProps<DataTableToolbarProps>();

const isFiltered = computed(() => props.table.getState().columnFilters.length > 0);
const paymentTypeOptionsCompat = paymentTypeOptions as unknown as StringFacetedFilterOption[];
const paymentStatusOptionsCompat = paymentStatusOptions as unknown as StringFacetedFilterOption[];
</script>

<template>
    <div class="flex items-center justify-between">
        <div class="flex flex-wrap gap-2 flex-1 items-center space-x-2">
            <UiInput
                placeholder="Filter transactions..."
                :model-value="(table.getColumn(TransactionTableColumnsEnum.TRANSACTION_ID)?.getFilterValue() as string) ?? ''"
                class="h-9 w-full md:w-[150px] lg:w-[250px]"
                @input="table.getColumn(TransactionTableColumnsEnum.TRANSACTION_ID)?.setFilterValue($event.target.value)"
            />
            <DataTableFilterInput
                v-if="table.getColumn(TransactionTableColumnsEnum.ORDER_ID)"
                :column="table.getColumn(TransactionTableColumnsEnum.ORDER_ID)"
                title="Order ID"
            />
            <DataTableFilterInput
                v-if="table.getColumn(TransactionTableColumnsEnum.INVOICE_ID)"
                :column="table.getColumn(TransactionTableColumnsEnum.INVOICE_ID)"
                title="Invoice ID"
            />
            <DataTableFilterFaceted
                v-if="table.getColumn(TransactionTableColumnsEnum.TYPE)"
                :column="table.getColumn(TransactionTableColumnsEnum.TYPE)"
                title="Type"
                :options="paymentTypeOptionsCompat"
            />
            <DataTableFilterDate title="Date" :column="table.getColumn(TransactionTableColumnsEnum.CREATED_AT)" />
            <DataTableFilterFaceted
                v-if="table.getColumn(TransactionTableColumnsEnum.STATUS)"
                :column="table.getColumn(TransactionTableColumnsEnum.STATUS)"
                title="Status"
                :options="paymentStatusOptionsCompat"
            />
            <DataTableFilterRange
                v-if="table.getColumn(TransactionTableColumnsEnum.TOTAL)"
                :column="table.getColumn(TransactionTableColumnsEnum.TOTAL)"
                title="Total"
                prefix="$"
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
