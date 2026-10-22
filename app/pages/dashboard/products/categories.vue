<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard',
});

usePageSeo({ title: 'Categories', robots: 'noindex,nofollow' });

const { isLocked } = useCategories();
</script>

<template>
  <section class="container mt-4">
    <CategoriesBreadcrumbs title="Categories" />
    <div class="flex flex-col w-full relative py-6 container bg-card rounded-xl">
      <div class="flex justify-between items-center mb-10">
        <h1 class="text-xl leading-[1.4] text-foreground font-semibold">Categories</h1>
        <h4>{{ isLocked ? 'Currently updating. Please wait and refresh again' : '' }}</h4>
        <CategoriesCreateNew />
      </div>
      <CategoriesFilters />
      <section
        ref="scrollRef"
        class="flex flex-col rounded-lg max-h-[calc(100vh-250px)] xl:max-h-[calc(100vh-450px)] overflow-y-auto overflow-x-hidden relative border border-grey-200"
      >
        <SharedScrollableRegion label="Categories table" test-id="categories-table">
          <CategoriesActions />
          <CategoriesRows />
        </SharedScrollableRegion>
      </section>
      <CategoriesDeleteAlert />
    </div>
  </section>
</template>
