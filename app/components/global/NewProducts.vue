<template>
  <ProductBlocks :rows-number="2" :fetched-products="productList" class="mb-7 lg:mb-[38px] xl:mb-[58px]">
    <template #header>
      <section class="flex justify-between items-center">
        <h2 class="text-xl font-medium ml-2">
          <slot> New Products </slot>
        </h2>
      </section>
    </template>
  </ProductBlocks>
</template>

<script setup lang="ts">
import type { ProductInterface } from '~~/types/product';
import { useProducts } from '~/composables/useProducts';

const { loadProductTabProducts } = useProducts();
const productList = ref<ProductInterface[]>([]);

async function getProductTab() {
  productList.value = await loadProductTabProducts('best-sellers');
}

onMounted(() => {
  getProductTab();
});
</script>
