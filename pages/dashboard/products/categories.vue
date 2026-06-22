<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});

const { isLocked } = useCategories();
</script>

<template>
  <section class="container mt-4">
    <CategoriesBreadcrumbs title="Categories" />
    <div class="flex flex-col w-full relative py-6 container bg-white rounded-xl">
      <div class="flex justify-between items-center mb-10">
        <h2 class="text-xl leading-[1.4] text-neutral-700 font-semibold">Categories</h2>
        <h4>{{ isLocked ? 'Currently updating. Please wait and refresh again' : '' }}</h4>
        <CategoriesCreateNew />
      </div>
      <CategoriesFilters />
      <section
        ref="scrollRef"
        class="flex flex-col rounded-lg max-h-[calc(100vh-250px)] xl:max-h-[calc(100vh-450px)] overflow-y-auto relative border border-grey-200"
      >
        <CategoriesActions />
        <CategoriesRows />
      </section>
      <CategoriesDeleteAlert />
    </div>
  </section>
</template>
