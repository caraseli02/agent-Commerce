<script setup lang="ts" generic="TData">
import type { Table } from '@tanstack/vue-table';
import { EyeIcon } from '@lucide/vue';

interface DataTableViewOptionsProps {
  table: Table<TData>;
}

const props = defineProps<DataTableViewOptionsProps>();

const columns = computed(() =>
  props.table.getAllColumns().filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide()),
);
</script>

<template>
  <UiDropdownMenu :modal="false">
    <UiDropdownMenuTrigger as-child>
      <UiButton variant="secondary" size="icon" aria-label="Toggle columns">
        <EyeIcon class="w-4 h-4" aria-hidden="true" />
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
