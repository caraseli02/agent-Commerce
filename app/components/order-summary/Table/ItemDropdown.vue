<template>
  <div class="bg-white rounded-b-lg flex flex-col gap-4 py-4">
    <div class="gap-2 flex flex-col xl:flex-row xl:justify-between">
      <NuxtLink :to="`/product/${item.id}`" class="flex flex-shrink-0 mr-2.5 md:mr-[15px]">
        <div class="flex flex-row px-4 gap-3">
          <div class="border-2 rounded-lg min-w-[60px] w-[60px] h-[60px] overflow-hidden">
            <ImageWithFallback :src="item.productEntity?.details?.ProductImage?.ProductImageSmall" class="object-cover w-full h-full" />
          </div>
          <ProductDetails :item="item" :short-stock="shortStock" :stock-item="stockItem" />
        </div>
      </NuxtLink>
      <div class="xl:pl-0 px-4">
        <div class="grid grid-cols-1 xl:grid-flow-col xl:gap-[16px] gap-2">
          <div class="flex flex-row justify-between xl:gap-4 items-center xl:flex-col">
            <span class="text-neutral-700 text-center text-sm font-normal leading-6 xl:gap-4 px-0 xl:px-4 whitespace-nowrap"
              >Unit Price</span
            >
            <div v-if="stockItem && lineMoney.discountPercent" class="flex lg:hidden">
              <div class="px-2 border-[1px] rounded-[25px] border-rose-500 bg-white ml-4 flex items-center lg:hidden">
                <span class="text-xs font-semibold leading-5 text-rose-500">{{ lineMoney.discountPercent }} %</span>
              </div>
            </div>
            <div v-if="lineMoney.discountPercent" class="flex flex-col text-center h-[36px] justify-center">
              <span v-if="hasDiscount" class="line-through text-neutral-700 text-sm font-normal leading-5">{{
                formatRegionalPrice(lineMoney.listUnitPrice, currency?.value)
              }}</span>
              <span class="text-sm font-normal leading-5" :class="hasDiscount ? 'text-rose-500' : ''">{{
                formatRegionalPrice(lineMoney.unitPrice, currency?.value)
              }}</span>
            </div>
            <div v-else class="flex flex-col text-center h-[36px] justify-center">
              <span class="text-neutral-700 text-sm font-normal leading-5">{{
                formatRegionalPrice(lineMoney.unitPrice, currency?.value)
              }}</span>
            </div>
          </div>
          <div class="flex flex-row justify-between items-center xl:flex-col xl:gap-4">
            <span class="text-neutral-700 text-center text-sm font-normal leading-6 xl:gap-4 px-0 xl:px-4">Quantity</span>
            <div>
              <QuantityButtons
                v-if="quantity"
                :model-value="quantity"
                size="lg"
                :type="stockItem ? OrderType.Stock : OrderType.Back"
                :update-only-available-stock="true"
                :object="{
                  action: ProductAction.Add,
                  id: item.id,
                  min: stockItem ? (item?.productEntity?.priceConfiguration?.configuration[0]?.quantity ?? 1) : 1,
                  max: item.productEntity?.stock,
                }"
                @update:model-value="quantity = $event"
              />
            </div>
          </div>
          <div class="flex flex-row justify-between items-center xl:flex-col xl:gap-4">
            <span class="text-neutral-700 text-center text-sm font-normal leading-6 xl:gap-4 px-0 xl:px-4"
              >Tax (VAT {{ vatPercent }}%)</span
            >
            <div class="flex flex-col text-center h-[36px] justify-center">
              <span class="text-neutral-700 text-sm font-normal leading-5">{{
                formatRegionalPrice(Number(taxPrice), currency?.value)
              }}</span>
            </div>
          </div>
          <div class="flex flex-row justify-between items-center xl:flex-col xl:gap-4">
            <span class="text-neutral-700 text-center text-sm font-normal leading-6 xl:gap-4 px-0 xl:px-4">Subtotal</span>
            <div class="flex flex-col text-center h-[36px] justify-center">
              <span class="text-neutral-700 text-sm font-normal leading-5">{{ formatRegionalPrice(subtotal, currency?.value) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="h-[1px] -mt-2 bg-light-500 mx-4 rounded-lg xl:hidden block" />
    <AdditionalDetails
      :item="item"
      :show-packaging-details="showPackagingDetails"
      :show-delivery-details="showDeliveryDetails"
      @toggle-packaging-details="togglePackagingDetails"
      @toggle-delivery-details="toggleDeliveryDetails"
      @delete-item="deleteItem = true"
      @removed="emits('updateQuantity')"
    />
    <CartDeleteDialog v-model="deleteItem" :product-ids="[item.id]" @close="deleteItem = false" @removed="emits('updateQuantity')" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import ProductDetails from './ProductDetails.vue';
import AdditionalDetails from './AdditionalDetails.vue';
import CartDeleteDialog from '~/components/cart/CartDeleteDialog.vue';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import { resolveOrderSummaryLineMoney, type OrderSummaryQuoteLine } from '~~/helpers/order-summary-line-money';
import { ProductAction, type CartProductsInterface } from '~~/types/cart';
import { formatRegionalPrice } from '~~/helpers/prices.helper';
import { useRegionalPreferencesStore } from '~/store/regionalPreferencesStore';

import { OrderType } from '~~/types';

const emits = defineEmits(['updateQuantity']);

const props = defineProps<{
  item: CartProductsInterface;
  quoteLine?: OrderSummaryQuoteLine;
  shortStock: boolean;
  stockItem: boolean;
}>();

const showPackagingDetails = ref(false);
const showDeliveryDetails = ref(false);
const deleteItem = ref(false);
const quantity = ref(props.stockItem ? props.item.stock : props.item.backorder_stock);
const regionalPreferencesStore = useRegionalPreferencesStore();
const { currency } = storeToRefs(regionalPreferencesStore);

watch(
  [quantity, deleteItem],
  () => {
    emits('updateQuantity');
  },
  { immediate: true },
);

const lineMoney = computed(() => resolveOrderSummaryLineMoney(props.item, props.quoteLine, props.stockItem ? 'stock' : 'backorder'));
const hasDiscount = computed(() => lineMoney.value.discountPercent > 0);

const vatPercent = 19;

const taxPrice = computed(() => {
  return lineMoney.value.vatTotal;
});

const subtotal = computed(() => {
  return lineMoney.value.subtotal;
});

function togglePackagingDetails() {
  showPackagingDetails.value = !showPackagingDetails.value;
}

function toggleDeliveryDetails() {
  showDeliveryDetails.value = !showDeliveryDetails.value;
}
</script>
