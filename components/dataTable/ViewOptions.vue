<script setup lang="ts" generic="TData">
import type { Table } from '@tanstack/vue-table';
import { EyeIcon } from 'lucide-vue-next';

interface DataTableViewOptionsProps {
  table: Table<TData>;
}

const props = defineProps<DataTableViewOptionsProps>();

const columns = computed(() =>
  props.table.getAllColumns().filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
);
</script>

<template>
  <UiDropdownMenu :modal="false">
    <UiDropdownMenuTrigger as-child>
      <UiButton class="bg-light-300 text-neutral-700 hover:bg-light-500" size="icon">
        <EyeIcon class="w-4 h-4" />
      </UiButton>
    </UiDropdownMenuTrigger>
    <UiDropdownMenuContent align="end" class="w-[150px]">
      <UiDropdownMenuLabel>Toggle columns</UiDropdownMenuLabel>
      <UiDropdownMenuSeparator />

      <UiDropdownMenuCheckboxItem
        v-for="column in columns"
        :key="column.id"
        class="capitalize"
        :checked="column.getIsVisible()"
        @update:checked="(value) => column.toggleVisibility(!!value)"
      >
        {{ column.id }}
      </UiDropdownMenuCheckboxItem>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
