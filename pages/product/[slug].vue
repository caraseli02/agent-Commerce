<template>
  <div class="pt-5 md:pt-0">
    <ProductBreadcrumbs v-if="product" :product="product" />
    <div class="container mb-[30px] lg:mb-10">
      <div class="w-full flex items-center justify-end md:gap-0w mb-3">
        <UiDropdownMenu :modal="false">
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="ghost" class="flex h-10 w-10 p-0 text-slate-500 sm:hidden">
              <MoreVertical class="h-5 w-5" />
              <span class="sr-only">Product actions</span>
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end" class="w-[220px] sm:hidden">
            <UiDropdownMenuItem @click="askDialog?.open()"> Ask about the product </UiDropdownMenuItem>
            <UiDropdownMenuItem @click="reportErrorDialog?.open()"> Report an error </UiDropdownMenuItem>
            <UiDropdownMenuItem @select="printPage"> Print this page </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>

        <ProductAskDialog ref="askDialog" trigger-class="hidden sm:inline-flex" />
        <DialogReportError ref="reportErrorDialog" trigger-class="hidden sm:inline-flex" />
        <UiButton variant="link" class="hidden sm:inline-flex text-slate-300 gap-1" @click="printPage">
          <PrinterIcon class="w-[22px] h-[22px]" />
          <span class="text-xs leading-tight">Print this page</span>
        </UiButton>
      </div>
      <div
        class="grid grid-cols-1 gap-y-[30px] mb-[30px] md:grid-cols-2 md:gap-6 lg:grid-rows-1 lg:items-start lg:mb-10 min-[1440px]:grid-cols-[minmax(0,340fr)_minmax(0,542fr)_minmax(0,460fr)]"
      >
        <ProductGallery
          v-if="product && images"
          v-model="activeImageIndex"
          class="col-span-2 min-w-0 lg:col-span-1"
          :images="images"
          :product="product"
          @show-zoom-modal="showZoomGallery = true"
        />
        <ProductDetails v-if="product" class="col-span-2 min-w-0 lg:col-span-1" :product="product" />
        <ProductQuantity v-if="product" :product="product as unknown as ProductInterface" />
      </div>
      <LazyProductTable v-if="product" :features="product?.details?.ParametricData?.Features" />
    </div>
    <ProductBanners />
    <NewProducts> Similar Products </NewProducts>
    <Banner class="hidden lg:flex xl:hidden" />
    <div class="container mb-[30px] lg:mb-10 xl:mb-[60px]">
      <div class="grid grid-cols-1 gap-[15px] md:grid-cols-[40%,calc(60%-20px)] md:gap-5 xl:grid-cols-[41%,calc(59%-20px)]">
        <QuickBuy />
        <EcxlusiveOffer />
      </div>
    </div>
    <ProductBlocks :rows-number="2" class="mb-7 lg:mb-[38px] xl:mb-[58px]" :filters="filters" />
    <News />
    <Manufacturers />
    <ProductZoomGallery
      v-if="product"
      v-model:selected-index="activeImageIndex"
      v-model:open="showZoomGallery"
      :alias="product.alias"
      :images="images"
    />
  </div>
</template>

<script setup lang="ts">
import { MoreVertical, PrinterIcon } from 'lucide-vue-next';

import type { ProductDetail } from '~~/model/products/response/ProductDetailResponse';
import type { ProductImageInterface, ProductInterface } from '~~/model/products/response/ProductResponse';
import { fetchSingleProduct } from '~/composables/api/products';

const route = useRoute();
const productSlug = computed(() => {
  const slug = route.params.slug;
  return Array.isArray(slug) ? slug[0] : slug;
});

const product = ref<ProductDetail | null>(null);
const { data } = await fetchSingleProduct(productSlug.value);
product.value = data;

const seoTitle = computed(() => product.value?.name || 'Product');
const seoDescription = computed(
  () => product.value?.description || 'Review product details, availability, pricing, and specifications in the ECAS portfolio demo.'
);
const seoImage = computed(() => product.value?.details?.ProductImage?.ProductImageLarge || '');

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogImage: seoImage,
  ogType: 'website',
});

const images = computed((): ProductImageInterface[] => {
  const productImage = product.value?.details?.ProductImage;

  if (!productImage) {
    return [];
  }

  return Array.isArray(productImage) ? productImage.filter((image): image is ProductImageInterface => Boolean(image)) : [productImage];
});

const filters = ['Featured', 'Best Sellers', 'Hot Deals', 'Top Searched'];

const activeImageIndex = ref(0);
const showZoomGallery = ref(false);

const askDialog = ref<{ open: () => void } | null>(null);
const reportErrorDialog = ref<{ open: () => void } | null>(null);

const printPage = () => {
  if (import.meta.client) {
    window.print();
  }
};
</script>
