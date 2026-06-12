<script setup lang="ts" generic="TData">
import type { Table } from '@tanstack/vue-table';
import { XIcon } from 'lucide-vue-next';
import { CustomerTableColumnsEnum } from '~/components/admin-table/customer/columns.enum';
import { accountType } from '~/components/admin-table/customer/options';

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
const accountTypeOptions = accountType as unknown as StringFacetedFilterOption[];
</script>

<template>
    <div class="flex items-center justify-between">
        <div class="flex flex-wrap gap-2 flex-1 items-center space-x-2">
            <UiInput
                placeholder="Filter customers..."
                :model-value="(table.getColumn(CustomerTableColumnsEnum.NAME)?.getFilterValue() as string) ?? ''"
                class="h-9 w-full md:w-[150px] lg:w-[250px]"
                @input="table.getColumn(CustomerTableColumnsEnum.NAME)?.setFilterValue($event.target.value)"
            />
            <DataTableFilterFaceted
                v-if="table.getColumn(CustomerTableColumnsEnum.ACCOUNT)"
                :column="table.getColumn(CustomerTableColumnsEnum.ACCOUNT)"
                title="Type"
                :options="accountTypeOptions"
            />
            <DataTableFilterInput
                v-if="table.getColumn(CustomerTableColumnsEnum.COMPANY)"
                :column="table.getColumn(CustomerTableColumnsEnum.COMPANY)"
                title="Company"
            />
            <DataTableFilterDate title="Date" :column="table.getColumn(CustomerTableColumnsEnum.CREATED_AT)" />
            <DataTableFilterRange
                v-if="table.getColumn(CustomerTableColumnsEnum.SPENT)"
                :column="table.getColumn(CustomerTableColumnsEnum.SPENT)"
                title="Spent"
                prefix="$"
            />
            <DataTableFilterRange
                v-if="table.getColumn(CustomerTableColumnsEnum.ORDERS_COUNT)"
                :column="table.getColumn(CustomerTableColumnsEnum.ORDERS_COUNT)"
                title="Orders count"
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
