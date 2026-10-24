<script setup lang="ts">
import type { Column, Table } from '@tanstack/vue-table';
import { ArrowDownWideNarrowIcon, ArrowUpWideNarrowIcon, ChevronsUpDownIcon } from '@lucide/vue';

import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps {
  column: Column<unknown, unknown>;
  title: string;
  table?: Table<unknown>;
}

defineProps<DataTableColumnHeaderProps>();

const sortLabel = (column: Column<unknown, unknown>, title: string) => {
  const sorted = column.getIsSorted();
  if (sorted === 'asc') return `${title}, sorted ascending. Sort descending`;
  if (sorted === 'desc') return `${title}, sorted descending. Sort ascending`;
  return `Sort by ${title}`;
};
</script>

<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>

<template>
  <div v-if="column.getCanSort()" :class="cn('flex items-center', $attrs.class ?? '')">
    <UiButton
      type="button"
      variant="ghost"
      size="xs"
      class="-ml-3"
      :aria-label="sortLabel(column, title)"
      @click="column.toggleSorting(column.getIsSorted() === 'asc')"
    >
      <span>{{ title }}</span>
      <ArrowDownWideNarrowIcon v-if="column.getIsSorted() === 'desc'" class="ml-2 h-4 w-4" aria-hidden="true" />
      <ArrowUpWideNarrowIcon v-else-if="column.getIsSorted() === 'asc'" class="ml-2 h-4 w-4" aria-hidden="true" />
      <ChevronsUpDownIcon v-else class="ml-2 h-4 w-4" aria-hidden="true" />
    </UiButton>
    <!-- <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="ghost" size="sm" class="-ml-3 font-medium h-8 text-foreground data-[state=open]:bg-accent">
              <span>{{ title }}</span>
              <ArrowDownIcon v-if="column.getIsSorted() === 'desc'" class="ml-2 h-4 w-4" />
              <ArrowUpIcon v-else-if="column.getIsSorted() === 'asc'" class="ml-2 h-4 w-4" />
              <CaretSortIcon v-else class="ml-2 h-4 w-4" />
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="start">
            <UiDropdownMenuItem @click="column.toggleSorting(false)">
              <ArrowUpIcon class="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Asc
            </UiDropdownMenuItem>
            <UiDropdownMenuItem @click="column.toggleSorting(true)">
              <ArrowDownIcon class="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Desc
            </UiDropdownMenuItem>
            <UiDropdownMenuSeparator />
            <UiDropdownMenuItem @click="column.toggleVisibility(false)">
              <EyeNoneIcon class="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Hide
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu> -->
  </div>
  <!-- <UiInput v-if="column.getCanFilter()" placeholder="Filter tasks..." class="h-8 w-[150px] lg:w-[250px]" /> -->
  <div v-else class="text-foreground" :class="$attrs.class">
    {{ title }}
  </div>
</template>
