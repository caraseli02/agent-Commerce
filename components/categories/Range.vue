<script setup lang="ts" generic="TData">
import { PlusCircleIcon } from 'lucide-vue-next';

import { PopoverClose } from 'radix-vue';

interface DataTableInputFilter {
  title?: string;
  prefix?: string;
}

const props = defineProps<DataTableInputFilter>();

const range = ref([0, 0]);

const cancel = () => {
  range.value = [0, 0];
  // props.column?.setFilterValue(undefined);
};
const apply = () => {
  // props.column?.setFilterValue(range.value);
  range.value = [0, 0];
};

// const selectedValues = computed(() => props.column?.getFilterValue() as string[]);
</script>

<template>
  <UiPopover>
    <UiPopoverTrigger as-child>
      <UiButton variant="outline" size="sm" class="!ml-0 border-dashed text-neutral-700">
        <PlusCircleIcon class="mr-2 h-4 w-4 text-neutral-700" />
        {{ title }}
        <!-- Check if either min or max range values are greater than 0 -->
        <template v-if="range[0] !== 0 || range[1] !== 0">
          <UiSeparator orientation="vertical" class="mx-2 h-4" />
          <!-- Badge for Min -->
          <UiBadge v-if="range[0] !== 0" variant="secondary" class="rounded bg-light-300 px-1 py-[3px] font-normal mr-1">
            Min: {{ range[0] }}
          </UiBadge>
          <!-- Badge for Max -->
          <UiBadge v-if="range[1] !== 0" variant="secondary" class="rounded bg-light-300 px-1 py-[3px] font-normal">
            Max: {{ range[1] }}
          </UiBadge>
        </template>
      </UiButton>
    </UiPopoverTrigger>
    <UiPopoverContent class="w-[256px] flex gap-4 p-0 justify-between" align="start">
      <div class="grid grid-cols-1 gap-5 rounded-lg bg-white p-4 px-3 w-[256px] shadow-xs">
        <div class="flex items-end gap-3">
          <label>
            <div class="flex items-center border border-gray-300 rounded-lg pl-3 text-[14px] leading-4 h-8">
              <span v-if="props.prefix" class="font-medium mr-1">{{ props.prefix }}</span>
              <input v-model.number="range[0]" type="number" class="bg-transparent py-2 w-full focus:outline-none" />
            </div>
          </label>
          <div class="h-full pt-[2.5px]">-</div>
          <label>
            <div class="flex items-center border border-gray-300 rounded-lg pl-3 text-[14px] leading-4 h-8">
              <span v-if="props.prefix" class="font-medium mr-1">{{ props.prefix }}</span>
              <input v-model.number="range[1]" type="number" class="bg-transparent py-2 w-full focus:outline-none" />
            </div>
          </label>
        </div>
        <section class="h-12">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm leading-[1.43] font-medium">{{ props.prefix }}{{ range[0] }}</div>
            <div class="text-sm leading-[1.43] font-medium">{{ props.prefix }}{{ range[1] }}</div>
          </div>
          <UiSlider
            v-model="range"
            :min="0"
            :max="100000"
            :step="10"
            :tooltips="false"
            class="rangeSlider bg-light-500"
            @slide="range = $event"
          />
        </section>
        <div class="flex justify-between items-center gap-3">
          <UiButton variant="secondary" class="w-full" size="xs" @click="cancel"> Clear Filter </UiButton>
          <PopoverClose class="w-full" as-child>
            <UiButton size="xs" @click="apply"> Apply </UiButton>
          </PopoverClose>
        </div>
      </div>
    </UiPopoverContent>
  </UiPopover>
</template>
