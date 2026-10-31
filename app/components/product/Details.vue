<template>
  <div class="col-span-2 lg:col-span-1 min-w-0 w-full relative bg-card rounded-2xl font-Inter px-4 py-4 shadow-m md:px-5 md:py-5 lg:h-full">
    <div class="flex items-start justify-between gap-4 mb-5">
      <div class="flex min-w-0 items-center">
        <h1 class="mr-2 min-w-0 text-xl font-semibold leading-tight">
          {{ product.name }}
        </h1>
        <CopyClipboard
          :text="product.name || 'N/A'"
          :label="`Copy ${product.name || 'product name'}`"
          class="mr-2 text-muted-foreground transition-colors duration-300 hover:text-primary"
        />
      </div>
    </div>
    <div class="divide-y divide-border">
      <div class="flex flex-col gap-1.5 px-3 py-3">
        <div class="text-xs leading-tight font-medium flex-shrink-0 text-foreground">Description</div>
        <div class="text-xs leading-5 text-muted-foreground">
          {{ product.description }}
        </div>
      </div>
      <div class="flex items-center justify-between gap-3 px-3 py-3">
        <div class="text-xs leading-tight font-medium flex-shrink-0 text-foreground">Manufacturer</div>
        <div class="text-xs leading-tight text-muted-foreground">
          {{ product.manufacturer }}
        </div>
      </div>
      <div v-if="product.manufacturerCode" class="flex items-center justify-between gap-3 px-3 py-3">
        <div class="text-xs leading-tight font-medium flex-shrink-0 text-foreground">Manufacturer part number</div>
        <div class="text-xs leading-tight text-muted-foreground">
          {{ product.manufacturerCode }}
        </div>
      </div>
      <div v-if="datasheet" class="flex items-center justify-between gap-3 px-3 py-3">
        <div class="text-xs leading-tight font-medium flex-shrink-0">EDA / CAD Models</div>
        <div class="flex items-center">
          <CADModelsIcon class="w-4 h-4 mr-[5px]" />
          <span class="text-xs leading-tight text-muted-foreground"> {{ cadModelLabel }} </span>
        </div>
      </div>
      <div v-if="datasheet" class="flex items-center justify-between gap-3 px-3 py-3">
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
          <span class="text-xs leading-tight text-muted-foreground hover:underline"> {{ product.name }} datasheet </span>
        </a>
        <span v-else class="flex min-h-11 items-center">
          <PDFIcon class="w-5 h-5 mr-[5px]" />
          <span class="text-xs leading-tight text-muted-foreground"> {{ product.name }} datasheet </span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CADModelsIcon from '@/assets/icons/cad-models.svg';
import PDFIcon from '@/assets/icons/pdf.svg';
import type { ProductDetail } from '~~/types/product';
import { getProductDatasheet, getProductDatasheetUrl } from '~~/helpers/product-datasheet';

const props = defineProps<{
  product: ProductDetail;
}>();

const datasheet = computed(() => getProductDatasheet(props.product));
const datasheetUrl = computed(() => getProductDatasheetUrl(props.product));
const cadModelLabel = computed(() => `${props.product.alias || props.product.manufacturerCode || props.product.name}-ECAD-Model`);
</script>
