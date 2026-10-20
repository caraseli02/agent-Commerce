<template>
  <ProductBlocks :rows-number="2" class="mb-7 lg:mb-[38px] xl:mb-[58px]" :filters="filters" :fetched-products="productList ?? []">
    <template #header>
      <section class="mb-4 flex flex-col gap-4 px-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-slate-900 md:text-2xl">Featured inventory</h2>
          <p class="mt-1 text-sm text-slate-500">Compare sample parts before you commit to a shortlist.</p>
        </div>
        <NuxtLink
          to="/search"
          class="inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          Browse in-stock catalog <ArrowRight class="h-4 w-4" aria-hidden="true" />
        </NuxtLink>
      </section>
    </template>
  </ProductBlocks>
</template>

<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';
import { useProducts } from '~/composables/useProducts';

const filters = ['Featured', 'Best Sellers', 'Hot Deals', 'Top Searched'];
const { loadFeaturedProductsList } = useProducts();
const { data: productList } = await useAsyncData('home-featured-products', () => loadFeaturedProductsList());
</script>
