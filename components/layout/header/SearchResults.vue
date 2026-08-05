<template>
  <div
    v-if="isLoading || props.products"
    class="absolute z-50 -bottom-2.5 translate-y-full left-0 w-full bg-white border border-light-300 rounded-lg py-2 pl-2 pr-0.5 shadow-md md:rounded-xl md:-bottom-0.5"
    :style="{
      boxShadow: '0px 4px 12px rgba(51, 51, 51, 0.1)',
    }"
  >
    <div v-if="isLoading">
      <p class="p-2 rounded text-slate-500 transition-colors duration-300">Loading...</p>
    </div>
    <div v-else>
      <div v-if="productsView.length > 0" class="grid grid-cols-1 max-h-[340px] overflow-auto scrollbar-thin pr-1.5">
        <template v-for="row in productsView" :key="row.product._id">
          <NuxtLink
            :to="`/product/${row.product._id}`"
            class="p-2 rounded-lg text-slate-500 transition-colors duration-300 hover:bg-light-300"
          >
            <div
              class="flex items-center justify-between gap-1 text-xs leading-[1.67] font-medium text-neutral-700 mb-1 lg:text-sm lg:leading-[1.43]"
            >
              <div class="flex items-center w-[calc(100%-50px)] hover:text-primary">
                <template v-if="row.categoryTitle">
                  <div class="truncate">{{ row.categoryTitle }}</div>
                  <CaretIcon class="w-4 h-4 flex-shrink-0" />
                </template>
                <div class="font-Inter">{{ row.product.name }}</div>
              </div>
              <div
                v-if="!row.product.adminSettings?.featured"
                class="rounded-3xl bg-primary px-1 text-xs leading-[1.33] font-semibold text-primary-foreground flex-shrink-0 lg:translate-y-2.5"
              >
                New
              </div>
            </div>
            <div class="text-xs leading-[1.33] truncate text-slate-500 lg:w-[calc(100%-50px)] hover:text-primary">
              {{ row.product.description }}
            </div>
          </NuxtLink>
        </template>
      </div>
      <div v-else>
        <p class="p-2 rounded text-slate-500 transition-colors duration-300 hover:bg-gray-100 hover:text-primary">No data found</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import CaretIcon from '@/assets/icons/caret-right.svg';
import type { ProductInterface } from '~/types/product';
import { mapLabelsToIds, mapPathArrayOfNames } from '~/helpers/categories.helper';
import type { CategoriesMap } from '~/types/dashboard/categories';
import { humanizeCategorySlug, toCategorySlugSegments } from '~/helpers/categoryPath.helper';

const { categories } = useCategories();

const props = defineProps<{
  products: ProductInterface[];
  isLoading: boolean;
}>();

// Build the taxonomy label map once per categories change — not once per product row render.
const categoriesMap = computed<CategoriesMap>(() => mapLabelsToIds(categories.value ?? []));

const resolveProductCategoryTitle = (product: ProductInterface, map: CategoriesMap) => {
  if (!product.path) {
    return '';
  }

  const categoriesLabelsArray = mapPathArrayOfNames(product.path, map);
  const categoryName = categoriesLabelsArray[categoriesLabelsArray.length - 1]?.name;
  if (categoryName) {
    return categoryName;
  }

  const segments = toCategorySlugSegments(product.path);
  return humanizeCategorySlug(segments[segments.length - 1] ?? '');
};

const productsView = computed(() => {
  const map = categoriesMap.value;
  return (props.products ?? []).map((product) => ({
    product,
    categoryTitle: resolveProductCategoryTitle(product, map),
  }));
});
</script>
