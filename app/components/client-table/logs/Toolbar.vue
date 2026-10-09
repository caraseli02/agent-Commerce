<script setup lang="ts" generic="TData">
import type { Table } from '@tanstack/vue-table';
import { LogsTableColumnsEnum } from '~/components/client-table/logs/columns.enum';

interface DataTableToolbarProps {
  table: Table<TData>;
}

defineProps<DataTableToolbarProps>();
</script>

<template>
  <div class="flex items-center justify-between">
    <div class="flex flex-wrap gap-2 flex-1 items-center space-x-2">
      <UiInput
        placeholder="Search"
        :model-value="(table.getColumn(LogsTableColumnsEnum.TYPE)?.getFilterValue() as string) ?? ''"
        class="h-9 w-full md:w-[150px] lg:w-[250px]"
        @input="table.getColumn(LogsTableColumnsEnum.TYPE)?.setFilterValue($event.target.value)"
      />
    </div>
  </div>
</template>
