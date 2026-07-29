<script setup lang="ts">
import CaretRightIcon from '@/assets/icons/caret-right.svg';
import type { ProductDetail } from '~/model/products/response/ProductDetailResponse';
import { buildCategoryCrumbs } from '~/helpers/categoryPath.helper';

const props = defineProps<{
  product: ProductDetail;
}>();

const product = toRefs(props.product);

// TaxonomyPath names drive the links; each crumb keeps its own slug path so it browses that level.
const taxonomyCrumbs = computed(() => buildCategoryCrumbs(product.details?.value?.SummaryData?.TaxonomyPath?.split('>') ?? []));
</script>

<template>
  <div class="hidden mb-[30px] md:flex">
    <div class="container">
      <div class="border-b border-gray-200 pt-[15px] pb-[14px]">
        <div class="flex items-center gap-1 text-slate-500">
          <template v-for="crumb in taxonomyCrumbs" :key="crumb.path">
            <CaretRightIcon class="w-4 h-4" />
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
