<template>
  <div class="flex flex-col pb-4 border-b border-gray-200 mx-2 last:border-b-0">
    <div class="flex items-start">
      <NuxtLink :to="`/product/${product.id}`" class="flex flex-shrink-0 mr-2.5 md:mr-[15px]">
        <ImageWithFallback
          :src="typeof productItem.image === 'string' ? productItem.image : undefined"
          :alt="productItem.title"
          :class-name="thumbnailClass"
        />
        <div>
          <div class="flex items-center mb-1">
            <div class="font-semibold mr-2 text-sm leading-[1.71]">
              {{ productItem.title }}
            </div>
          </div>
          <div class="text-sm leading-[1.43] font-semibold font-Inter" :class="[productDiscount ? 'text-red' : '']">
            <strong>
              {{
                currentConfigurationDiscountPrice
                  ? `${currentConfigurationDiscountPrice.toFixed(2)} Lei`
                  : minPriceConfiguration?.price.toFixed(2) || '-'
              }}
            </strong>
            {{ currentPriceConfiguration ? `(${currentPriceConfiguration.quantity}+)` : '-' }}
          </div>
        </div>
      </NuxtLink>
      <UiButton
        variant="ghost"
        size="icon"
        class="ml-auto text-slate-500 transition-colors duration-300 hover:text-rose-500"
        aria-label="Remove item from cart"
        @click="deleteItemFromCart"
      >
        <TrashIcon class="w-5 h-5" />
      </UiButton>
    </div>

    <div class="flex items-end justify-between">
      <div class="font-Inter font-semibold leading-[1.25]">
        {{ product ? (currentConfigurationDiscountPrice * (quantity || 1)).toFixed(2) : 0 }} Lei
      </div>
      <QuantityButtons
        v-if="typeof productItem.quantity === 'number'"
        v-model="quantity"
        :object="{ action: ProductAction.Add, id: productItem.id, min: minPriceConfiguration?.quantity } as ProductActionObject"
        class="mr-10"
        @update:model-value="
          quantity = $event;
          getPricesConfiguration();
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { storeToRefs } from 'pinia';
import TrashIcon from '@/assets/icons/trash-can.svg';
import { ProductAction } from '~/types/cart';
import type { ProductActionObject } from '~/types/cart';
import type { PriceConfigurationSettingsInterface, ProductInterface } from '~/types/product';
import { parseProductPriceConfiguration } from '~/helpers/prices.helper';
import { useCart } from '~/composables/useCart';
import { useAuthStore } from '~/store/authStore';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';

export interface CartLineItem {
  id: string;
  title: string;
  description?: string;
  image?: string;
  productEntity: ProductInterface;
  quantity: number;
}

const props = defineProps({
  product: {
    type: Object as PropType<CartLineItem>,
    required: true,
  },
});

const productItem = ref<CartLineItem>(props.product);
const emits = defineEmits(['delete-product']);

const authStore = useAuthStore();
const { removeFromCart } = useCart();
const { getUserDetails } = storeToRefs(authStore);

const minPriceConfiguration = ref<PriceConfigurationSettingsInterface | undefined>(undefined);
const currentPriceConfiguration = ref<PriceConfigurationSettingsInterface | undefined>(undefined);
const discountPrice = ref(0);
const currentConfigurationDiscountPrice = ref(0);
const userDiscount = ref(0);
const productDiscount = ref(0);

const quantity = ref(productItem.value.quantity || minPriceConfiguration.value?.quantity || 10);
const thumbnailClass = computed(
  () => 'w-12 h-12 border border-border rounded-lg overflow-hidden object-cover mr-3 md:w-14 md:h-14 flex-shrink-0',
);

const getPricesConfiguration = () => {
  if (!props.product?.productEntity) {
    minPriceConfiguration.value = undefined;
    currentPriceConfiguration.value = undefined;
    discountPrice.value = 0;
    currentConfigurationDiscountPrice.value = 0;
    userDiscount.value = 0;
    productDiscount.value = 0;
    return;
  }

  const discountsHelper = parseProductPriceConfiguration(props.product.productEntity, getUserDetails.value, quantity.value);

  minPriceConfiguration.value = discountsHelper?.minimumOrderQuantityConfiguration;
  currentPriceConfiguration.value = discountsHelper?.priceConfiguration;
  discountPrice.value = discountsHelper?.discountPrice || 0;
  currentConfigurationDiscountPrice.value = discountsHelper?.currentConfigurationDiscountPrice || 0;
  userDiscount.value = discountsHelper?.userDiscount || 0;
  productDiscount.value = discountsHelper?.productDiscount || 0;
};

getPricesConfiguration();

const deleteItemFromCart = async () => {
  await removeFromCart({ products: [props.product?.id] });
  emits('delete-product', props.product);
};

watch(
  productItem,
  () => {
    getPricesConfiguration();
  },
  { deep: true },
);
</script>
