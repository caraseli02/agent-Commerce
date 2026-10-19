<template>
  <div
    class="col-span-2 lg:col-span-1 min-w-0 w-full relative bg-white rounded-2xl font-Inter px-4 py-4 shadow-m md:px-5 md:py-5 lg:h-full"
  >
    <div class="flex items-start justify-between gap-4 mb-5">
      <div class="flex min-w-0 items-center">
        <h1 class="mr-2 min-w-0 text-xl font-semibold leading-tight">
          {{ product.name }}
        </h1>
        <CopyClipboard
          :text="product.name || 'N/A'"
          :label="`Copy ${product.name || 'product name'}`"
          class="mr-2 text-slate-500 transition-colors duration-300 hover:text-blue-500"
        />
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
      <UiButton type="button" variant="link" class="h-auto min-h-11 p-0" @click="showCustomProductPartNumberModal = true">
        <span class="text-xs leading-tight mr-[5px] text-slate-500"> Your Custom Code </span>
        <SquarePen class="w-4 h-4 stroke-1" />
      </UiButton>
    </div>
    <div class="flex items-center justify-between gap-3 px-3 py-3">
      <div class="text-xs leading-tight font-medium flex-shrink-0">EDA / CAD Models</div>
      <div class="flex items-center">
        <CADModelsIcon class="w-4 h-4 mr-[5px]" />
        <span class="text-xs leading-tight text-slate-500"> {{ cadModelLabel }} </span>
      </div>
    </div>
    <div class="flex items-center justify-between gap-3 rounded-lg bg-light-100 px-3 py-3">
      <div class="text-xs leading-tight font-medium flex-shrink-0">Technical Datasheet</div>
      <a
        v-if="datasheetUrl"
        class="flex min-h-11 items-center"
        :href="datasheetUrl"
        :download="`${product.name} Datasheet`"
        target="_blank"
        rel="noopener noreferrer"
      >
        <PDFIcon class="w-5 h-5 mr-[5px]" />
        <span class="text-xs leading-tight text-slate-500 hover:underline"> {{ product.name }}-DataSheet </span>
      </a>
      <span v-else class="text-xs leading-tight text-slate-500">Not available</span>
    </div>
    <div v-if="productTags.length" class="mt-1 flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-3">
      <div class="text-xs leading-tight font-medium flex-shrink-0">Tags:</div>
      <div class="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs leading-tight font-medium text-blue-500">
        <span v-for="tag in productTags" :key="tag"> #{{ tag }} </span>
      </div>
    </div>
    <LayoutCustomProductPartNumberModal
      v-if="showCustomProductPartNumberModal"
      :manufacturer-code="product.manufacturerCode || product.alias"
      @close="showCustomProductPartNumberModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { SquarePen } from '@lucide/vue';
import CADModelsIcon from '@/assets/icons/cad-models.svg';
import PDFIcon from '@/assets/icons/pdf.svg';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import type { ProductDetail } from '~~/types/product';

const props = defineProps<{
  product: ProductDetail;
}>();

const showCustomProductPartNumberModal = ref(false);
const datasheetUrl = computed(() => props.product.details?.SummaryData?.Datasheet?.trim() || '');
const productTags = computed(() =>
  (props.product.details?.SummaryData?.TaxonomyPath || '')
    .split('>')
    .map((segment) => segment.trim())
    .filter(Boolean),
);
const cadModelLabel = computed(() => `${props.product.alias || props.product.manufacturerCode || props.product.name}-ECAD-Model`);
</script>
