<script setup lang="ts">
import CaretRightIcon from '@/assets/icons/caret-right.svg';
import type { ProductDetail } from '~~/types/product';
import { buildCategoryCrumbs, getProductTaxonomyPath } from '~~/helpers/categoryPath.helper';

const props = defineProps<{
  product: ProductDetail;
}>();

// TaxonomyPath names drive the links; each crumb keeps its own slug path so it browses that level.
const taxonomyCrumbs = computed(() => {
  const taxonomyPath = getProductTaxonomyPath(props.product);
  return buildCategoryCrumbs(taxonomyPath ? taxonomyPath.split('>') : []);
});
</script>

<template>
  <div class="hidden mb-[30px] md:flex">
    <div class="container">
      <div class="border-b border-gray-200 dark:border-border pt-[15px] pb-[14px]">
        <div class="flex items-center gap-1 text-muted-foreground">
          <template v-for="(crumb, index) in taxonomyCrumbs" :key="crumb.path">
            <CaretRightIcon v-if="index > 0" class="w-4 h-4" />
            <NuxtLink
              :to="`/search?category=${encodeURIComponent(crumb.path)}`"
              class="text-xs leading-[1.33] font-Inter transition-colors duration-300 hover:text-blue-500"
            >
              {{ crumb.name }}
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
