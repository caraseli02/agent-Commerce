<template :key="route.fullPath">
  <div class="mb-[30px] md:mb-10 xl:mb-8">
    <div class="container">
      <div v-if="categoryLabels.length > 0" class="flex items-center justify-between border-b border-gray-200 py-2.5">
        <div class="flex items-center gap-1">
          <!-- Breadcrumb links -->
          <NuxtLink
            v-for="(categoryObj, index) in categoryLabels"
            :key="index"
            :to="`/search?category=${categoryObj.id}`"
            class="text-xs leading-[1.33] text-slate-500 font-Inter md:flex lg:font-medium"
            :class="{ 'font-semibold': index === categoryLabels.length - 1 }"
            @click="changePath(index)"
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
import { onMounted, ref } from 'vue';
import CaretRightIcon from '@/assets/icons/caret-right.svg';
import { useCategories } from '~/composables/useCategories';
import { findCategory, mapLabelsToIds, mapPathArrayOfNames } from '~/helpers/categories.helper';

const { categories, getCategories } = useCategories();

const emits = defineEmits(['change-path']);

const route = useRoute();
const category = ref(route.query.category);
const categoryLabels = ref<{ id: string; name: string }[]>([]);
const map = ref({});

onMounted(async () => {
  await loadCategoryLabels();
});

// Watch for changes to `category` and reload category labels as needed
watch(category, async () => {
  await loadCategoryLabels();
});

// Load category labels
async function loadCategoryLabels() {
  if (category.value) {
    await getCategories();
    map.value = mapLabelsToIds(categories.value);

    const path = findCategory(category.value.toString(), categories.value)?.path;
    if (path) {
      categoryLabels.value = mapPathArrayOfNames(path.toString(), map.value);
    }
  }
}

async function changePath(index: number) {
  await loadCategoryLabels();
  categoryLabels.value = categoryLabels.value.slice(0, index + 1);
  emits('change-path');
}
</script>
