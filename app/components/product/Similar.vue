<template>
  <ProductBlocks v-if="items.length" :rows-number="1" :fetched-products="items" class="mb-7 lg:mb-[38px] xl:mb-[58px]">
    <template #header>
      <section class="flex items-center justify-between">
        <h2 class="ml-2 text-xl font-medium">Similar products</h2>
      </section>
    </template>
  </ProductBlocks>
</template>

<script setup lang="ts">
import type { ProductDetail, ProductInterface } from '~~/types/product';
import { useProducts } from '~/composables/useProducts';

const props = defineProps<{
  product: ProductDetail;
}>();

const { searchHeaderResults } = useProducts();

// Same top-level category as the viewed part; the page renders nothing when there is no other part to suggest.
const category = computed(() => props.product.path?.split('/').filter(Boolean)[0] ?? null);

const { data } = await useAsyncData<ProductInterface[]>(
  () => `similar-products::${props.product.alias ?? props.product._id}`,
  async () => {
    if (!category.value) return [];
    const result = await searchHeaderResults('', category.value, 1, 9);
    return (result?.items ?? []).filter((item) => item._id !== props.product._id).slice(0, 8);
  },
  { watch: [() => props.product._id], default: () => [] },
);

const items = computed(() => data.value ?? []);
</script>
