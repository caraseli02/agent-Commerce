<script setup lang="ts">
import { SearchIcon, XIcon } from '@lucide/vue';
// Define status options
const statusOptions = [
  { label: 'Published', value: 'published', color: 'bg-green-600' },
  { label: 'Unpublished', value: 'unpublished', color: 'bg-rose-600' },
];

const { searchQuery } = useCategories();
</script>

<!-- CategoriesFilters.vue -->
<template>
  <section class="flex gap-4 self-stretch pb-4 bg-card flex-wrap">
    <div class="relative w-full md:max-w-[220px] items-center">
      <UiInput id="search" v-model="searchQuery" type="text" placeholder="Filter category name..." class="pr-10 h-9 border-blue-500" />
      <span class="absolute end-1 inset-y-0 flex items-center justify-center px-1">
        <SearchIcon v-if="searchQuery === ''" class="w-6 h-6 text-muted-foreground" />
        <UiButton v-else size="icon" variant="link" class="h-8" @click="searchQuery = ''">
          <XIcon class="size-5 text-muted-foreground" />
        </UiButton>
      </span>
    </div>
    <CategoriesRange title="Items Total" />
    <CategoriesFacetedFilter title="Status" :options="statusOptions" />
    <UiButton
      v-if="searchQuery !== ''"
      variant="ghost"
      class="h-9 px-2 lg:px-3 flex items-center text-foreground"
      @click="searchQuery = ''"
    >
      Reset
      <XIcon class="ml-2 h-4 w-4" />
    </UiButton>
  </section>
</template>

<style scoped></style>
