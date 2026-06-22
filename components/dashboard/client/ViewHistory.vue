<template>
  <ProductBlocks class="!mt-10 md:!px-2 lg:!px-4" :fetched-products="viewHistory">
    <template #header>
      <h5 class="font-semibold leading-6 ml-2">View History</h5>
    </template>
  </ProductBlocks>
</template>

<script setup lang="ts">
import type { ProductInterface } from '~/model/products/response/ProductResponse';

defineProps<{
  viewHistory: Array<ProductInterface>;
}>();
</script>
