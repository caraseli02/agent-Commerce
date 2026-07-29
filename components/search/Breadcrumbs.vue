<template :key="route.fullPath">
  <div class="mb-[30px] md:mb-10 xl:mb-8">
    <div class="container">
      <div v-if="categoryLabels.length > 0" class="flex items-center justify-between border-b border-gray-200 py-2.5">
        <div class="flex items-center gap-1">
          <!-- Breadcrumb links -->
          <NuxtLink
            v-for="(categoryObj, index) in categoryLabels"
            :key="categoryObj.path"
            :to="`/search?category=${encodeURIComponent(categoryObj.path)}`"
            class="text-xs leading-[1.33] text-slate-500 font-Inter md:flex lg:font-medium"
            :class="{ 'font-semibold': index === categoryLabels.length - 1 }"
          >
            <CaretRightIcon v-if="index > 0" class="hidden w-4 h-4 md:flex" />
            {{ categoryObj.name }}
          </NuxtLink>
        </div>
        <div class="hidden font-semibold md:block">
          {{ categoryLabels[categoryLabels.length - 1].name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import CaretRightIcon from '@/assets/icons/caret-right.svg';
import { useCategories } from '~/composables/useCategories';
import { findCategory, findCategoryByPath } from '~/helpers/categories.helper';
import type { CategoryCrumb } from '~/helpers/categoryPath.helper';
import { buildSlugPathCrumbs, normalizeCategoryPath } from '~/helpers/categoryPath.helper';

const { categories, getCategories } = useCategories();

const route = useRoute();
// Read from the route on every navigation so breadcrumbs follow `?category=` changes.
const category = computed(() => route.query.category?.toString() ?? '');
const categoryLabels = ref<CategoryCrumb[]>([]);

// `?category=` carries a slug path; older links carried a taxonomy id, so resolve those to their path.
const resolveCategoryPath = (value: string) => {
  const slugPath = normalizeCategoryPath(value);
  if (findCategoryByPath(slugPath, categories.value)) {
    return slugPath;
  }
  return findCategory(value, categories.value)?.path ?? slugPath;
};

async function loadCategoryLabels() {
  if (!category.value) {
    categoryLabels.value = [];
    return;
  }

  await getCategories();
  categoryLabels.value = buildSlugPathCrumbs(
    resolveCategoryPath(category.value),
    (path) => findCategoryByPath(path, categories.value)?.name
  );
}

onMounted(async () => {
  await loadCategoryLabels();
});

watch(category, async () => {
  await loadCategoryLabels();
});
</script>
