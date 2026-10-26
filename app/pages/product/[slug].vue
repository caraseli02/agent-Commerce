<template>
  <div class="pt-5 md:pt-0">
    <div v-if="pending" class="container mb-10 min-h-[480px]" aria-busy="true" aria-live="polite">
      <div class="h-6 w-72 rounded bg-slate-100 animate-pulse mb-6" />
      <div
        class="grid grid-cols-1 gap-y-[30px] md:grid-cols-2 md:gap-6 lg:grid-rows-1 xl:grid-cols-[minmax(0,340fr)_minmax(0,542fr)_minmax(0,460fr)]"
      >
        <div class="col-span-2 min-h-[320px] rounded-2xl bg-slate-100 animate-pulse lg:col-span-1" />
        <div class="col-span-2 min-h-[280px] rounded-2xl bg-slate-100 animate-pulse lg:col-span-1" />
        <div class="col-span-2 min-h-[220px] rounded-2xl bg-slate-100 animate-pulse" />
      </div>
      <span class="sr-only">Loading product details…</span>
    </div>

    <div v-else-if="error" class="container mb-10 min-h-[320px] flex flex-col items-start justify-center gap-4" role="alert">
      <p class="text-lg font-semibold text-foreground">We could not load this product</p>
      <p class="text-sm text-muted-foreground max-w-xl">
        The product may be unavailable or the link may be outdated. Try again or return to the catalog.
      </p>
      <div class="flex flex-wrap gap-3">
        <UiButton type="button" @click="refresh()">Try again</UiButton>
        <NuxtLink
          to="/search"
          class="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Browse catalog
        </NuxtLink>
      </div>
    </div>

    <template v-else-if="product">
      <ProductBreadcrumbs :product="product" />
      <div class="container mb-[30px] lg:mb-10">
        <div class="w-full flex items-center justify-end md:gap-0w mb-3">
          <UiDropdownMenu :modal="false">
            <UiDropdownMenuTrigger as-child>
              <UiButton variant="ghost" class="flex h-10 w-10 p-0 text-muted-foreground sm:hidden">
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

          <ProductAskDialog ref="askDialog" :part-number="product.manufacturerCode" trigger-class="hidden sm:inline-flex" />
          <DialogReportError ref="reportErrorDialog" trigger-class="hidden sm:inline-flex" />
          <UiButton variant="link" class="hidden sm:inline-flex text-muted-foreground gap-1" @click="printPage">
            <PrinterIcon class="w-[22px] h-[22px]" />
            <span class="text-xs leading-tight">Print this page</span>
          </UiButton>
        </div>
        <div
          class="grid grid-cols-1 gap-y-[30px] mb-[30px] md:grid-cols-2 md:gap-6 lg:grid-rows-1 lg:items-stretch lg:mb-10 xl:grid-cols-[minmax(0,340fr)_minmax(0,542fr)_minmax(0,460fr)]"
        >
          <ProductGallery
            v-if="images.length"
            v-model="activeImageIndex"
            class="order-1 col-span-2 min-w-0 lg:col-span-1"
            :images="images"
            :product="product"
            @show-zoom-modal="showZoomGallery = true"
          />
          <ProductDetails class="order-2 col-span-2 min-w-0 lg:col-span-1" :product="product" />
          <ProductQuantity class="order-3" :product="product" />
        </div>
        <LazyProductTable :features="product?.details?.ParametricData?.Features" />
      </div>
      <ProductSimilar :product="product" />
      <LazyProductZoomGallery
        v-if="showZoomGallery"
        v-model:selected-index="activeImageIndex"
        v-model:open="showZoomGallery"
        :alias="product.alias ?? ''"
        :images="images"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { MoreVertical, PrinterIcon } from '@lucide/vue';

import type { ProductDetail, ProductImageInterface } from '~~/types/product';
import { useProducts } from '~/composables/useProducts';
import { buildProductPageJsonLd } from '~~/helpers/product-json-ld';

const { loadProductBySlug, productDetailCacheKey } = useProducts();

const route = useRoute();
const productSlug = computed(() => {
  const slug = route.params.slug;
  return Array.isArray(slug) ? slug[0] : slug;
});

const {
  data: product,
  pending,
  error,
  refresh,
} = await useAsyncData<ProductDetail>(
  () => productDetailCacheKey(productSlug.value ?? ''),
  () => loadProductBySlug(productSlug.value ?? ''),
  {
    watch: [productSlug],
  },
);

const seoTitle = computed(() => product.value?.name || 'Product');
const seoDescription = computed(
  () =>
    product.value?.description ||
    'Review product details, availability, pricing, and specifications in the Components Marketplace portfolio demo.',
);
const seoImage = computed(() => product.value?.details?.ProductImage?.ProductImageLarge || '');

const { siteUrl, toAbsoluteUrl } = useSiteUrl();

usePageSeo({
  title: seoTitle,
  description: seoDescription,
  image: seoImage,
  type: 'product',
  // Same URL the canonical link uses, so the structured data describes the page crawlers index.
  jsonLd: () => (product.value ? buildProductPageJsonLd(product.value, { toAbsoluteUrl, pageUrl: `${siteUrl}${route.path}` }) : null),
});

const images = computed((): ProductImageInterface[] => {
  const productImage = product.value?.details?.ProductImage;

  if (!productImage) {
    return [];
  }

  return Array.isArray(productImage) ? productImage.filter((image): image is ProductImageInterface => Boolean(image)) : [productImage];
});

const activeImageIndex = ref(0);
const showZoomGallery = ref(false);

watch(productSlug, () => {
  showZoomGallery.value = false;
  activeImageIndex.value = 0;
});

const askDialog = ref<{ open: () => void } | null>(null);
const reportErrorDialog = ref<{ open: () => void } | null>(null);

const printPage = () => {
  if (import.meta.client) {
    window.print();
  }
};
</script>
