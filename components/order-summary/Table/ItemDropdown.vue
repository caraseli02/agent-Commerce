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
            <div v-if="stockItem && item.discount.value" class="flex lg:hidden">
              <div class="px-2 border-[1px] rounded-[25px] border-rose-500 bg-white ml-4 flex items-center lg:hidden">
                <span class="text-xs font-semibold leading-5 text-rose-500">{{ item.discount.value }} %</span>
              </div>
            </div>
            <div v-if="item.discount?.value" class="flex flex-col text-center h-[36px] justify-center">
              <span v-if="discounts?.productDiscount" class="line-through text-neutral-700 text-sm font-normal leading-5"
                >{{ item.initialUnitPrice.toFixed(2) }} Lei</span
              >
              <span class="text-sm font-normal leading-5" :class="discounts?.productDiscount ? 'text-rose-500' : ''"
                >{{ discounts?.currentConfigurationDiscountPrice.toFixed(2) }} Lei</span
              >
            </div>
            <div v-else class="flex flex-col text-center h-[36px] justify-center">
              <span class="text-neutral-700 text-sm font-normal leading-5"
                >{{ discounts?.currentConfigurationDiscountPrice.toFixed(2) }} Lei</span
              >
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
                  min: stockItem ? item?.productEntity?.priceConfiguration?.configuration[0]?.quantity ?? 1 : 1,
                  max: item.productEntity?.stock,
                }"
                @update:model-value="quantity = $event"
              />
            </div>
          </div>
          <div class="flex flex-row justify-between items-center xl:flex-col xl:gap-4">
            <span class="text-neutral-700 text-center text-sm font-normal leading-6 xl:gap-4 px-0 xl:px-4">Tax (VAT 19%)</span>
            <div class="flex flex-col text-center h-[36px] justify-center">
              <span class="text-neutral-700 text-sm font-normal leading-5">{{ Number(taxPrice).toFixed(2) }} Lei</span>
            </div>
          </div>
          <div class="flex flex-row justify-between items-center xl:flex-col xl:gap-4">
            <span class="text-neutral-700 text-center text-sm font-normal leading-6 xl:gap-4 px-0 xl:px-4">Subtotal</span>
            <div class="flex flex-col text-center h-[36px] justify-center">
              <span class="text-neutral-700 text-sm font-normal leading-5">{{ subtotal.toFixed(2) }} Lei</span>
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
  </div>
  <LayoutFavoritesModalsDelete
    v-model="deleteItem"
    :remove-only-stock-quantity="stockItem && !!item.backorder_stock && item.backorder_stock > 0"
    :remove-only-backstock-quantity="!stockItem && item.stock > 0"
    :products="[toFavoriteItem(item)]"
    :delete-from-cart="true"
    @close="deleteItem = false"
    @removed="emits('updateQuantity')"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import ProductDetails from './ProductDetails.vue';
import AdditionalDetails from './AdditionalDetails.vue';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import { useAuthStore } from '~/store/authStore';
import { parseProductPriceConfiguration } from '~/helpers/prices.helper';
import { ProductAction, type CartProductsInterface } from '~/types/cart';

import { OrderType, type FavoriteItem } from '~/types';

const emits = defineEmits(['updateQuantity']);

function toFavoriteItem(cartItem: CartProductsInterface): FavoriteItem {
  return {
    id: cartItem.id,
    type: 'product',
    title: cartItem.productEntity?.name ?? cartItem.id,
    productEntity: cartItem.productEntity!,
  };
}

const props = defineProps<{
  item: CartProductsInterface;
  shortStock: boolean;
  stockItem: boolean;
}>();

const showPackagingDetails = ref(false);
const showDeliveryDetails = ref(false);
const deleteItem = ref(false);
const quantity = ref(props.stockItem ? props.item.stock : props.item.backorder_stock);

const authStore = useAuthStore();
const { getUserDetails } = storeToRefs(authStore);

watch(
  [quantity, deleteItem],
  () => {
    emits('updateQuantity');
  },
  { immediate: true }
);

const discounts = computed(() => {
  if (!props.item.productEntity) {
    return null;
  }
  const backorder_stock = props.item.backorder_stock || 0;
  return parseProductPriceConfiguration(props.item.productEntity, getUserDetails.value, props.item.stock + backorder_stock);
});

const taxPrice = computed(() => {
  if (!quantity.value) return 0;
  const subtotalValue = quantity.value * (discounts.value?.currentConfigurationDiscountPrice || 0);
  return (subtotalValue * 0.19).toFixed(2);
});

const subtotal = computed(() => {
  if (!discounts.value) {
    return 0;
  }
  if (!quantity.value) return 0;
  return quantity.value * (discounts.value.currentConfigurationDiscountPrice || 0);
});

function togglePackagingDetails() {
  showPackagingDetails.value = !showPackagingDetails.value;
}

function toggleDeliveryDetails() {
  showDeliveryDetails.value = !showDeliveryDetails.value;
}
</script>
