<script setup lang="ts"></script>

<template>
  <div class="flex flex-col w-full relative py-6 container">
    <CategoriesBreadcrumbs title="Categories">
      <CategoriesCreateNew />
    </CategoriesBreadcrumbs>
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
</template>
