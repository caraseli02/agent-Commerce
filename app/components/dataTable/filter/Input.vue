<script setup lang="ts" generic="TData">
import type { Column } from '@tanstack/vue-table';
import { PlusCircleIcon, SearchIcon } from '@lucide/vue';

interface DataTableInputFilter {
  column?: Column<TData, unknown>;
  title?: string;
}

const props = defineProps<DataTableInputFilter>();
defineEmits<{
  onInput: [value: string];
}>();

const isNameOrEmailValid = (input: string) => {
  // 1. Basic name validation (alphabets, spaces, hyphens, apostrophes)
  const nameRegex = /^[A-Za-z\s\-']+$/;

  // 2. Simple email validation (local part, @, domain)
  const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;

  // Test against either regex
  return nameRegex.test(input) || emailRegex.test(input);
};

const searchText = ref('');

const addToSearch = () => {
  const trimmedName = searchText.value.trim();
  if (props.title === 'Name' && !isNameOrEmailValid(trimmedName)) {
    console.error('Invalid name input. Please enter a valid name.');
    return;
  }
  if (trimmedName) {
    props.column?.setFilterValue(trimmedName);
  }
};

// const clearFilters = () => {
//   searchText.value = ''
//   searchArr.value = []
//   emit('onInput','')
// }

const selectedValues = computed(() => new Set(props.column?.getFilterValue() as string[]));
</script>

<template>
  <UiPopover>
    <UiPopoverTrigger as-child>
      <UiButton variant="outline" size="sm" class="!ml-0 border-dashed text-foreground">
        <PlusCircleIcon class="mr-2 h-4 w-4" />
        {{ title }}
        <template v-if="selectedValues.size > 0">
          <UiSeparator orientation="vertical" class="mx-2 h-4" />
          <!-- <UiBadge
            variant="secondary"
            class="rounded bg-accent px-1 font-normal lg:hidden"
          >
            {{ searchArr.length }}
          </UiBadge>
          <div class="hidden space-x-1 lg:flex">
            <UiBadge
              v-if="searchArr.length > 2"
              variant="secondary"
              class="rounded bg-accent px-1 py-[3px] font-normal"
            >
              {{ searchArr.length }} selected
            </UiBadge>
            <template v-else>
              <UiBadge
                v-for="item in searchArr"
                :key="item"
                variant="secondary"
                class="rounded bg-accent px-1 py-[3px] font-normal"
              >
                {{ item }}
              </UiBadge>
            </template>
          </div> -->
          <UiBadge variant="secondary" class="rounded bg-accent px-1 py-[3px] font-normal">
            {{ props.column?.getFilterValue() }}
          </UiBadge>
        </template>
      </UiButton>
    </UiPopoverTrigger>
    <UiPopoverContent class="w-[280px] flex flex-col gap-2 p-2" align="start">
      <div class="flex gap-3 justify-between">
        <UiInput v-model="searchText" placeholder="Filter name or email..." class="h-9 w-full text-foreground border-border" />
        <!-- <UiInput
        placeholder="Filter name or email..."
        :model-value=modelValue
        class="h-8 w-full"
        @input="emit('onInput',$event.target.value)"
      /> -->
        <UiButton variant="secondary" size="icon" class="h-9 min-w-9" @click="addToSearch()">
          <SearchIcon class="w-5 h-5" />
        </UiButton>
      </div>
      <UiButton
        v-if="selectedValues.size > 0"
        class="text-foreground font-normal text-sm"
        size="sm"
        variant="ghost"
        @click="column?.setFilterValue(undefined)"
      >
        Clear filters
      </UiButton>
    </UiPopoverContent>
  </UiPopover>
</template>
