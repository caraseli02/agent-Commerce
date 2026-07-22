<template>
  <ProductBlocks
    masonry-view
    :rows-number="2"
    class="mb-7 lg:mb-[38px] xl:mb-[58px]"
    :filters="filters"
    :fetched-products="productList ?? []"
  >
    <template #banner>
      <div class="md:pt-6 md:pr-0 h-[calc(100%-30px)] mx-2 md:mx-3 xl:mx-0 xl:mr-3 xl:min-w-[330px] xl:min-h-[592px]">
        <div
          class="flex h-full gap-4 md:gap-[40px] bg-slate-50 border border-slate-200 rounded-xl p-6 md:m-0 xl:flex-col xl:w-[330px] xl:mb-[30px]"
        >
          <img
            :src="PromoItem"
            alt="Electronic component kit"
            class="h-[100px] w-[120px] md:h-auto md:w-[290px] md:max-h-[240px] xl:w-full object-contain"
            loading="lazy"
          >
          <div class="flex-1 flex gap-4 flex-col justify-center xl:justify-start xl:items-start">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contract pricing</p>
            <div class="font-semibold text-sm xl:text-xl">Volume rates on in-stock lines</div>
            <p class="text-xs text-slate-600 md:text-[13px] xl:text-base">
              Qualifying quantities unlock better unit pricing on semiconductors, passives, and connectors — without leaving the catalog.
            </p>
            <NuxtLink
              to="/search"
              class="flex w-fit bg-primary text-[13px] font-medium px-3 py-1.5 rounded-lg text-primary-foreground md:text-sm md:px-6 md:py-[11px] xl:mt-6"
            >
              Review tiers
            </NuxtLink>
          </div>
        </div>
      </div>
    </template>
  </ProductBlocks>
</template>

<script setup lang="ts">
import PromoItem from '@/assets/media/home/black-friday-item.png';
import type { ProductResponse } from '~/model/products/response/ProductResponse';
import { fetchProductTab } from '~/composables/api/products';
import { loadFeaturedProducts } from '~/composables/loadFeaturedProducts';

const filters = ['Featured', 'Best Sellers', 'Hot Deals', 'Top Searched'];
const config = useRuntimeConfig();
const requestFetch = useRequestFetch();

const { data: productList } = await useAsyncData('home-featured-products', () =>
  loadFeaturedProducts({
    mockMode: Boolean(config.public.MOCK_MODE),
    fetchMock: () => requestFetch<ProductResponse>('/api/products/featured'),
    fetchLive: () => fetchProductTab('featured'),
  })
);
</script>
