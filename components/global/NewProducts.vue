<template>
  <ProductBlocks :rows-number="2" :fetched-products="productList" class="mb-7 lg:mb-[38px] xl:mb-[58px]">
    <template #header>
      <section class="flex justify-between items-center">
        <div class="text-xl font-medium ml-2">
          <slot> New Products </slot>
        </div>
      </section>
    </template>
  </ProductBlocks>
</template>

<script setup lang="ts">
import type { ProductInterface } from '~/model/products/response/ProductResponse';
import { fetchProductTab } from '~/composables/api/products';

const productList = ref<ProductInterface[]>([]);

async function getProductTab() {
  const response = await fetchProductTab('best-sellers');
  const data = response?.data || response;

  if (Array.isArray(data)) {
    productList.value = data as ProductInterface[];
  }
}

onMounted(() => {
  getProductTab();
});
</script>
