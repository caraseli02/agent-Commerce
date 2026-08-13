<script setup lang="ts">
import type { Component } from 'vue';
import { CheckIcon, PlusCircleIcon } from 'lucide-vue-next';

import { cn } from '@/lib/utils';

interface DataTableFacetedFilter {
  title?: string;
  options: {
    label: string;
    value: string;
    color?: string;
    icon?: Component;
  }[];
}

defineProps<DataTableFacetedFilter>();

const selectedValues = ref<Set<string>>(new Set());

function filterOptions(list: string[], term: string) {
  return list.filter((item) => item.toLowerCase().includes(term.toLowerCase()));
}

function setFilterValue(value: string[] | undefined) {
  selectedValues.value = value ? new Set(value) : new Set();
}

function toggleFilterValue(optionValue: string) {
  if (selectedValues.value.has(optionValue)) {
    selectedValues.value.delete(optionValue);
  } else {
    selectedValues.value.add(optionValue);
  }

  const filterValues = Array.from(selectedValues.value.values()) as string[];
  setFilterValue(filterValues.length ? filterValues : undefined);
}
</script>

<template>
  <UiPopover>
    <UiPopoverTrigger as-child>
      <UiButton variant="outline" size="sm" class="h-9 border-dashed font-medium">
        <PlusCircleIcon class="mr-2 h-4 w-4" />
        {{ title }}
        <template v-if="selectedValues.size > 0">
          <UiSeparator orientation="vertical" class="mx-2 h-4" />
          <UiBadge variant="secondary" class="rounded-sm px-1 font-normal lg:hidden">
            {{ selectedValues.size }}
          </UiBadge>
          <div class="hidden space-x-1 lg:flex">
            <UiBadge v-if="selectedValues.size > 2" variant="secondary" class="rounded-sm px-1 font-normal">
              {{ selectedValues.size }} selected
            </UiBadge>

            <template v-else>
              <UiBadge
                v-for="option in options.filter((option) => selectedValues.has(option.value))"
                :key="option.value"
                variant="secondary"
                class="rounded-sm px-1 font-normal"
              >
                <span
                  v-if="option.color"
                  :class="option.color"
                  class="h-4 w-4 mr-2 rounded-full text-xs flex justify-center items-center"
                />
                {{ option.label }}
              </UiBadge>
            </template>
          </div>
        </template>
      </UiButton>
    </UiPopoverTrigger>
    <UiPopoverContent class="w-[200px] p-0" align="start">
      <UiCommand :filter-function="filterOptions">
        <UiCommandInput :placeholder="title" />
        <UiCommandList>
          <UiCommandEmpty>No results found.</UiCommandEmpty>
          <UiCommandGroup>
            <UiCommandItem v-for="option in options" :key="option.value" :value="option" @select="toggleFilterValue(option.value)">
              <div
                :class="
                  cn(
                    'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                    selectedValues.has(option.value) ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible'
                  )
                "
              >
                <CheckIcon :class="cn('h-4 w-4')" />
              </div>
              <component :is="option.icon" v-if="option.icon" class="mr-2 h-4 w-4 text-muted-foreground" />
              <span v-if="option.color" :class="option.color" class="h-4 w-4 mr-2 rounded-full text-xs flex justify-center items-center" />
              <span>{{ option.label }}</span>
              <!-- <span
                                v-if="facets?.get(option.value)"
                                class="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs"
                            >
                                {{ facets.get(option.value) }}
                            </span> -->
            </UiCommandItem>
          </UiCommandGroup>

          <template v-if="selectedValues.size > 0">
            <UiSeparator />
            <UiCommandGroup>
              <UiCommandItem :value="{ label: 'remove' }" class="justify-center text-center" @select="setFilterValue(undefined)">
                {{ 'remove' }}
              </UiCommandItem>
            </UiCommandGroup>
          </template>
        </UiCommandList>
      </UiCommand>
    </UiPopoverContent>
  </UiPopover>
</template>
