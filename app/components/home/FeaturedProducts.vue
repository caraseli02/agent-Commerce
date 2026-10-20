<template>
  <ProductBlocks
    masonry-view
    :rows-number="2"
    class="mb-7 lg:mb-[38px] xl:mb-[58px]"
    :filters="filters"
    :fetched-products="productList ?? []"
  >
    <template #header>
      <section class="mb-1 flex flex-col gap-1 px-2 md:flex-row md:items-end md:justify-between md:px-3">
        <div>
          <h2 class="text-xl font-semibold text-foreground md:text-2xl">Featured inventory</h2>
          <p class="text-sm text-muted-foreground">Compare live catalog options before you commit to a shortlist.</p>
        </div>
      </section>
    </template>
    <template #banner>
      <div class="order-1 h-[calc(100%-30px)] mx-2 md:pt-6 md:pr-0 md:mx-3 xl:order-2 xl:mx-0 xl:mr-3 xl:min-w-[330px]">
        <div
          class="flex h-full gap-4 rounded-xl border border-border bg-muted p-6 md:m-0 md:gap-6 xl:w-[330px] xl:flex-col xl:gap-6 xl:mb-[30px]"
        >
          <ImageWithFallback
            :src="PromoItem"
            alt="Electronic component kit"
            class-name="h-[100px] w-[120px] object-contain md:h-auto md:w-[290px] md:max-h-[240px] xl:h-[180px] xl:w-full xl:shrink-0"
          />
          <div class="flex flex-1 flex-col justify-center gap-4 xl:items-start xl:justify-start">
            <div>
              <div class="text-sm font-semibold xl:text-xl">Better rates on in-stock lines</div>
              <p class="mt-3 text-xs text-muted-foreground md:text-[13px] xl:text-base">
                Qualifying quantities unlock better unit pricing on semiconductors, passives, and connectors — without leaving the catalog.
              </p>
            </div>
            <NuxtLink
              to="/search"
              class="flex w-fit rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground md:px-6 md:py-[11px] md:text-sm xl:mt-auto"
            >
              Browse in-stock catalog
            </NuxtLink>
          </div>
        </div>
      </div>
    </template>
  </ProductBlocks>
</template>

<script setup lang="ts">
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import PromoItem from '@/assets/media/home/black-friday-item.png';
import { useProducts } from '~/composables/useProducts';

const filters = ['Featured', 'Best Sellers', 'Hot Deals', 'Top Searched'];
const { loadFeaturedProductsList } = useProducts();

const { data: productList } = await useAsyncData('home-featured-products', () => loadFeaturedProductsList());
</script>
