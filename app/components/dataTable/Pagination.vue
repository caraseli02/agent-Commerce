<script setup lang="ts" generic="TData">
import type { Table } from '@tanstack/vue-table';
import { ChevronRightIcon, ChevronLeftIcon, ChevronsRightIcon, ChevronsLeftIcon } from '@lucide/vue';
import UiSelectContent from '~/components/ui/select/SelectContent.vue';

defineProps<{
  totalItems: number;
  pageCount: number;
  table: Table<TData>;
}>();
</script>

<template>
  <div class="flex flex-col md:flex-row gap-4 md:items-center justify-between px-2">
    <div class="flex-1 text-sm text-muted-foreground">{{ totalItems }} item(s)</div>
    <div class="flex items-center justify-between space-x-6 lg:space-x-8">
      <div v-if="totalItems > 10" class="flex flex-col md:flex-row gap-4 md:items-center space-x-2">
        <p class="text-sm font-medium">Rows per page</p>
        <UiSelect
          v-if="totalItems"
          :key="totalItems"
          :model-value="`${table.getState().pagination.pageSize}`"
          @update:model-value="(value) => table.setPageSize(Number(value))"
        >
          <UiSelectTrigger class="h-8 w-[70px]">
            <UiSelectValue :placeholder="`${table.getState().pagination.pageSize}`" />
          </UiSelectTrigger>
          <UiSelectContent side="top">
            <UiSelectItem v-for="pageSize in [10, 20, 30, 40, 50]" :key="pageSize" class="cursor-pointer" :value="`${pageSize}`">
              {{ pageSize }}
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>
      </div>
      <section v-if="totalItems > 0" class="flex flex-col md:flex-row gap-4 item-center">
        <div class="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {{ table.getState().pagination.pageIndex + 1 }} of
          {{ pageCount }}
        </div>
        <div class="flex items-center space-x-2">
          <UiButton
            variant="outline"
            class="hidden h-8 w-8 p-0 lg:flex"
            :disabled="!table.getCanPreviousPage()"
            @click="table.setPageIndex(0)"
          >
            <span class="sr-only">Go to first page</span>
            <ChevronsLeftIcon class="h-4 w-4" />
          </UiButton>
          <UiButton variant="outline" class="h-8 w-8 p-0" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">
            <span class="sr-only">Go to previous page</span>
            <ChevronLeftIcon class="h-4 w-4" />
          </UiButton>
          <UiButton
            variant="outline"
            class="h-8 w-8 p-0"
            :disabled="pageCount === table.getState().pagination.pageIndex + 1 || pageCount === 1"
            @click="table.nextPage()"
          >
            <span class="sr-only">Go to next page</span>
            <ChevronRightIcon class="h-4 w-4" />
          </UiButton>
          <UiButton
            variant="outline"
            class="hidden h-8 w-8 p-0 lg:flex"
            :disabled="pageCount === table.getState().pagination.pageIndex + 1 || pageCount === 1"
            @click="table.setPageIndex(pageCount - 1)"
          >
            <span class="sr-only">Go to last page</span>
            <ChevronsRightIcon class="h-4 w-4" />
          </UiButton>
        </div>
      </section>
    </div>
  </div>
</template>
