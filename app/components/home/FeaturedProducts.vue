<template>
  <ProductBlocks tabs-in-header :rows-number="2" class="mt-12 md:mt-16" :filters="filters" :fetched-products="productList ?? []">
    <template #header>
      <div class="min-w-0">
        <h2 class="font-display text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground md:text-[28px]">
          Featured inventory
        </h2>
        <p class="mt-1.5 max-w-[60ch] text-[15px] leading-6 text-muted-foreground md:text-base">
          Stock and unit pricing at a glance.
          <NuxtLink
            to="/search"
            class="ml-1 inline-flex items-center gap-1 whitespace-nowrap rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Browse the full catalog
            <ArrowRight class="h-4 w-4" aria-hidden="true" />
          </NuxtLink>
        </p>
      </div>
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
