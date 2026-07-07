<template>
  <div class="col-span-2 lg:col-span-1 w-full relative bg-white rounded-2xl font-Inter px-4 py-4 shadow-m md:px-5 md:py-5 lg:self-start">
    <div class="flex items-start justify-between gap-4 mb-5">
      <div class="flex items-center">
        <div class="text-xl leading-tight font-semibold mr-2">
          {{ product.name }}
        </div>
        <button class="flex text-slate-500 transition-colors duration-300 mr-2 hover:text-blue-500">
          <CopyClipboard :text="product.name || 'N/A'" class="w-5 h-5" />
        </button>
      </div>
      <ImageWithFallback
        :src="product.details?.ProductImage?.ProductImageLarge"
        alt="Manufacturer logo"
        class-name="w-[82px] h-[50px] object-contain"
      />
    </div>
    <div class="flex items-start justify-between gap-3 rounded-lg bg-light-100 px-3 py-3">
      <div class="text-xs leading-tight font-medium flex-shrink-0 text-neutral-700">Description</div>
      <div class="text-xs leading-5 text-slate-500 text-end max-w-[62%]">
        {{ product.description }}
      </div>
    </div>
    <div class="flex items-center justify-between gap-3 px-3 py-3">
      <div class="text-xs leading-tight font-medium flex-shrink-0 text-neutral-700">Manufacturer</div>
      <div class="text-xs leading-tight text-slate-500">
        {{ product.manufacturer }}
      </div>
    </div>
    <div class="flex items-center justify-between gap-3 rounded-lg bg-light-100 px-3 py-3">
      <div class="text-xs leading-tight font-medium flex-shrink-0">Customer’s Code</div>
      <button
        class="flex items-center text-slate-500 transition-colors duration-300 hover:text-blue-500"
        @click="showCustomProductPartNumberModal = true"
      >
        <span class="text-xs leading-tight mr-[5px] text-slate-500"> Your Custom Code </span>
        <SquarePen class="w-4 h-4 stroke-1" />
      </button>
    </div>
    <div class="flex items-center justify-between gap-3 px-3 py-3">
      <div class="text-xs leading-tight font-medium flex-shrink-0">EDA / CAD Models</div>
      <button class="flex items-center">
        <CADModelsIcon class="w-4 h-4 mr-[5px]" />
        <span class="text-xs leading-tight text-slate-500"> ADIN2111BCPZ-ECAD-Model </span>
      </button>
    </div>
    <div class="flex items-center justify-between gap-3 rounded-lg bg-light-100 px-3 py-3">
      <div class="text-xs leading-tight font-medium flex-shrink-0">Technical Datasheet</div>
      <a class="flex items-center" :href="product.details?.SummaryData.Datasheet" :download="`${product.name} Datasheet`" target="_blank">
        <PDFIcon class="w-5 h-5 mr-[5px]" />
        <span class="text-xs leading-tight text-slate-500 hover:underline"> {{ product.name }}-DataSheet </span>
      </a>
    </div>
    <div class="mt-1 flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-3">
      <div class="text-xs leading-tight font-medium flex-shrink-0">Tags:</div>
      <div class="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs leading-tight font-medium text-blue-500">
        <span v-for="tag in productTags" :key="tag"> #{{ tag }} </span>
      </div>
    </div>
  </div>
  <Teleport to="body">
    <Transition name="fade">
      <LayoutCustomProductPartNumberModal v-if="showCustomProductPartNumberModal" @close="showCustomProductPartNumberModal = false" />
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { SquarePen } from 'lucide-vue-next';
import CADModelsIcon from '@/assets/icons/cad-models.svg';
import PDFIcon from '@/assets/icons/pdf.svg';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import type { ProductDetail } from '~~/model/products/response/ProductDetailResponse';

const props = defineProps<{
  product: ProductDetail;
}>();

const productTags = computed(() => {
  const taxonomy =
    props.product.details?.SummaryData?.TaxonomyPath?.split('>')
      .map((part) => part.trim())
      .filter(Boolean) ?? [];
  return [...new Set(taxonomy)].slice(0, 5);
});

const showCustomProductPartNumberModal = ref(false);
</script>
