<script setup lang="ts">
import CaretRightIcon from '@/assets/icons/caret-right.svg';
import type { ProductDetail } from '~/model/products/response/ProductDetailResponse';

const props = defineProps<{
  product: ProductDetail;
}>();

const product = toRefs(props.product);

const taxonomyPath = computed(() => {
  const pathArray = product.details?.value?.SummaryData?.TaxonomyPath?.split('>');
  return pathArray;
});
</script>

<template>
  <div class="hidden mb-[30px] md:flex">
    <div class="container">
      <div class="border-b border-gray-200 pt-[15px] pb-[14px]">
        <div class="flex items-center gap-1 text-slate-500">
          <template v-for="(path, index) in taxonomyPath" :key="index">
            <CaretRightIcon class="w-4 h-4" />
            <NuxtLink to="/" class="text-xs leading-[1.33] font-Inter transition-colors duration-300 hover:text-blue-500">
              {{ path }}
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
