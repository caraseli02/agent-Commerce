<script setup lang="ts" generic="TData">
import { PlusCircleIcon } from '@lucide/vue';
import { ref } from 'vue';
import type { Column } from '@tanstack/vue-table';
import { cn } from '@/lib/utils';

interface Filter {
  start: Date;
  end: Date;
}

const date = ref<Filter | undefined>(undefined);

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function transformObject(data: Filter): [string, string] {
  const formattedStartDate = formatDate(data?.start as Date);
  const formattedEndDate = formatDate(data?.end as Date);

  return [formattedStartDate, formattedEndDate];
}

const props = defineProps<{
  title: string;
  column?: Column<TData, unknown>;
}>();

watch(
  date,
  () => {
    if (!date.value) {
      return;
    }

    const filterValue = transformObject(date.value as Filter);
    props.column?.setFilterValue(filterValue);
    date.value = undefined;
  },
  { deep: true },
);

const selectedValues = computed(() => props.column?.getFilterValue()) as unknown as [string, string];
</script>

<template>
  <div :class="cn('grid gap-2 !ml-0', $attrs.class ?? '')">
    <UiPopover>
      <UiPopoverTrigger as-child>
        <UiButton
          id="date"
          :variant="'outline'"
          size="sm"
          :class="cn('justify-start text-left border-dashed px-2 !ml-0  text-neutral-700')"
        >
          <PlusCircleIcon class="mr-2 h-4 w-4" />
          {{ title }}
          <template v-if="selectedValues">
            <UiSeparator orientation="vertical" class="mx-2 h-4" />
            <span class="text-xs text-neutral-700 bg-light-300 p-1 mr-2 rounded font-light">
              {{ selectedValues[0].replaceAll('/', '-') }}
            </span>
            <span class="text-xs text-neutral-700 bg-light-300 p-1 rounded font-light">
              {{ selectedValues[1].replaceAll('/', '-') }}
            </span>
          </template>
        </UiButton>
      </UiPopoverTrigger>
      <UiPopoverContent class="w-auto p-0" :align="'end'">
        <UiCalendar v-model.range="date" :columns="2" />
      </UiPopoverContent>
    </UiPopover>
  </div>
</template>
