<script setup lang="ts">
import type { Column, Table } from '@tanstack/vue-table';
import { ArrowDownWideNarrowIcon, ArrowUpWideNarrowIcon, ChevronsUpDownIcon } from 'lucide-vue-next';

import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps {
  column: Column<unknown, unknown>;
  title: string;
  table?: Table<unknown>;
}

defineProps<DataTableColumnHeaderProps>();
</script>

<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>

<template>
  <div
    v-if="column.getCanSort()"
    :class="cn('flex items-center space-x-2 rounded-xl hover:bg-transparent', $attrs.class ?? '')"
  >
    <span>{{ title }}</span>
    <ArrowDownWideNarrowIcon
      v-if="column.getIsSorted() === 'desc'"
      class="ml-2 h-4 w-4 cursor-pointer"
      @click="column.toggleSorting(undefined)"
    />
    <ArrowUpWideNarrowIcon
      v-else-if="column.getIsSorted() === 'asc'"
      class="ml-2 h-4 w-4 cursor-pointer"
      @click="column.toggleSorting(true)"
    />
    <ChevronsUpDownIcon
      v-else
      class="ml-2 h-4 w-4 cursor-pointer"
      @click="column.toggleSorting(false)"
    />
    <!-- <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="ghost" size="sm" class="-ml-3 font-medium h-8 text-neutral-700 data-[state=open]:bg-accent">
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
  <div
    v-else
    class="text-neutral-700"
    :class="$attrs.class"
  >
    {{ title }}
  </div>
</template>
