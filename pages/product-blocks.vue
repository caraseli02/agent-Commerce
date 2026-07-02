<template>
  <div class="flex flex-col gap-8">
    <ProductBlocks :fetched-products="productList" class="mb-7 lg:mb-[38px] xl:mb-[58px]">
      <template #header>
        <section class="flex justify-between items-center ml-1">
          <div class="text-xl font-semibold">Browsing History</div>
        </section>
      </template>
      <!-- <template #banner>
        test banner
    </template> -->
    </ProductBlocks>
    <ProductBlocks :fetched-products="productList" class="mb-7 lg:mb-[38px] xl:mb-[58px]">
      <template #header>
        <section class="flex justify-between items-center ml-1 mr-2">
          <div class="text-xl font-semibold">Browsing History</div>
          <NuxtLink class="text-blue-500 flex items-center gap-2" to="/search">
            View All
            <SvgoArrowRight />
          </NuxtLink>
        </section>
      </template>
      <!-- <template #banner>
        test banner
    </template> -->
    </ProductBlocks>
    <ProductBlocks class="mb-7 lg:mb-[38px] xl:mb-[58px]" :filters="['Best Sellers', 'Top Searched']" />
    <ProductBlocks :rows-number="2" class="mb-7 lg:mb-[38px] xl:mb-[58px]" :filters="['Best Sellers', 'Top Searched']" />
    <ProductBlocks masonry-view :rows-number="2" class="mb-7 lg:mb-[38px] xl:mb-[58px]" :filters="filters" />
    <ProductBlocks masonry-view :rows-number="2" class="mb-7 lg:mb-[38px] xl:mb-[58px]" :filters="filters">
      <template #banner>
        <div class="md:pt-6 md:pr-0 h-[calc(100%-30px)] mx-2 xl:mx-0 xl:mr-3 xl:min-w-[330px] xl:min-h-[592px]">
          <div class="flex h-full gap-4 md:gap-[40px] bg-slate-50 border border-slate-200 rounded-xl p-6 md:m-0 xl:flex-col xl:w-[330px]">
            <img
              :src="PromoItem"
              alt="Electronic component"
              class="h-[100px] w-[120px] md:h-auto md:w-[290px] md:max-h-[240px] xl:w-full object-contain"
              loading="lazy"
            />
            <div class="flex-1 flex gap-4 flex-col justify-center xl:justify-start xl:items-start">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contract pricing</p>
              <div class="font-semibold text-sm xl:text-xl">Volume rates on in-stock lines</div>
              <p class="text-xs text-slate-600 md:text-[13px] xl:text-base">
                Qualifying quantities unlock better unit pricing on semiconductors, passives, and connectors.
              </p>
              <NuxtLink
                to="/search"
                class="flex w-fit bg-primary text-[13px] font-medium px-3 py-1.5 rounded-lg text-primary-foreground md:text-sm md:px-6 md:py-[11px] xl:mx-auto xl:mt-6"
              >
                Review tiers
              </NuxtLink>
            </div>
          </div>
        </div>
      </template>
    </ProductBlocks>
    <div class="max-w-[976px] mx-auto">
      <ProductBlocks order-summary-view :fetched-products="productList" class="mb-7 lg:mb-[38px] xl:mb-[58px]">
        <template #header>
          <section class="flex justify-between items-center ml-1">
            <div class="text-xl font-semibold">Similar Products</div>
          </section>
        </template>
        <!-- <template #banner>
          test banner
      </template> -->
      </ProductBlocks>
      <ProductBlocks order-summary-view class="mb-7 lg:mb-[38px] xl:mb-[58px]" :filters="['Best Sellers', 'Top Searched']" />
    </div>
  </div>
</template>

<script setup lang="ts">
import PromoItem from '@/assets/media/home/black-friday-item.png';
import type { ProductInterface } from '~/model/products/response/ProductResponse';
import { fetchProductTab } from '~/composables/api/products';

const productList = ref<ProductInterface[]>([]);

const filters = ['Featured', 'Best Sellers', 'Hot Deals', 'Top Searched'];

async function getProductTab() {
  const { data } = await fetchProductTab('top-searched');

  if (data) {
    productList.value = data as unknown as ProductInterface[];
    // productList.value = data?.map((item) => ({
    //     slug: item._id,
    //     title: item.alias,
    //     category: 'Not supported',
    //     price: new Intl.NumberFormat('en-US', {
    //         minimumFractionDigits: 3,
    //     }).format(item.priceEur),
    //     cover: item.details.ProductImage.ProductImageLarge,
    //     stock: item.stock,
    // }));
  }
}

onMounted(() => {
  getProductTab();
});
</script>
