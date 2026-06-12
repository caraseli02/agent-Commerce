<script setup lang="ts" generic="TData">
import type { Table } from '@tanstack/vue-table';
import { XIcon } from 'lucide-vue-next';
import { AgentsTableColumnsEnum } from '~/components/client-table/agents/columns.enum';

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

const statusType = [
    { value: 1, label: 'Active', badge: { bg: 'bg-green-800' } },
    { value: 2, label: 'Disabled', badge: { bg: 'bg-pink-500' } },
    { value: 3, label: 'Pending', badge: { bg: 'bg-yellow-500' } },
] as unknown as StringFacetedFilterOption[];
</script>

<template>
    <div class="flex items-center justify-between">
        <div class="flex flex-wrap gap-2 flex-1 items-center space-x-2">
            <UiInput
                placeholder="Filter customers..."
                :model-value="(table.getColumn(AgentsTableColumnsEnum.NAME)?.getFilterValue() as string) ?? ''"
                class="h-9 w-full md:w-[150px] lg:w-[250px]"
                @input="table.getColumn(AgentsTableColumnsEnum.NAME)?.setFilterValue($event.target.value)"
            />
            <DataTableFilterDate title="Date" :column="table.getColumn(AgentsTableColumnsEnum.CREATED_AT)" />
            <DataTableFilterRange
                v-if="table.getColumn(AgentsTableColumnsEnum.ORDERS_COUNT)"
                :column="table.getColumn(AgentsTableColumnsEnum.ORDERS_COUNT)"
                title="Orders"
            />
            <DataTableFilterRange
                v-if="table.getColumn(AgentsTableColumnsEnum.TOTAL)"
                :column="table.getColumn(AgentsTableColumnsEnum.TOTAL)"
                title="Total"
                prefix="$"
            />
            <DataTableFilterFaceted
                v-if="table.getColumn(AgentsTableColumnsEnum.STATUS)"
                :column="table.getColumn(AgentsTableColumnsEnum.STATUS)"
                title="Status"
                :options="statusType"
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
