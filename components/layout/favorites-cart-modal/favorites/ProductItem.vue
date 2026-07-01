<template>
  <div class="flex flex-col pb-4" :class="[inModal ? '' : 'border-b border-gray-200 mx-2 last:border-b-0']">
    <div class="flex" :class="[inModal ? 'items-center' : 'items-start']">
      <NuxtLink :to="`/product/${product.id}`" class="flex flex-shrink-0 mr-2.5 md:mr-[15px]">
        <label v-if="inModal" class="flex cursor-pointer mr-2.5">
          <input :value="productItem.selected" type="checkbox" class="sr-only" @change="$emit('select')" />
          <div
            class="flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded mt-px border transition-colors duration-300"
            :class="[
              productItem.selected
                ? 'bg-blue-500 border-blue-500 group-hover:bg-white'
                : 'bg-white  border-border group-hover:border-gray-300',
            ]"
          >
            <CheckIcon v-if="productItem.selected" class="w-4 text-white transition-colors duration-300 group-hover:text-blue-500" />
          </div>
        </label>
        <ImageWithFallback
          :src="typeof productItem.image === 'string' ? productItem.image : undefined"
          :alt="productItem.title"
          :class-name="thumbnailClass"
        />
        <div :class="[inModal ? '<truncate' : '']">
          <div class="flex items-center" :class="[inModal ? '' : 'mb-1']">
            <div class="font-semibold mr-2" :class="[inModal ? 'text-xs leading-tight' : 'text-sm leading-[1.71]']">
              {{ productItem.title }}
            </div>
            <button
              v-if="!inModal && !inCart"
              class="flex text-slate-500 transition-colors duration-300 mr-2 hover:text-blue-500"
              @click="copyItems = true"
            >
              <CopyIcon class="w-[18px] h-[18px]" />
            </button>
            <button v-if="!inModal" class="flex text-slate-500 transition-colors duration-300 mr-2 hover:text-blue-500">
              <InfoIcon class="w-4 h-4" />
            </button>
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
      <button
        v-if="!inModal"
        class="flex items-center justify-center ml-auto text-slate-500 transition-colors duration-300 hover:text-rose-500"
        @click="deleteItemFromCart"
      >
        <TrashIcon class="w-5 h-5" />
      </button>
    </div>

    <div v-if="!inModal" class="flex items-end justify-between">
      <div v-if="!inCart" class="flex items-center">
        <label class="flex cursor-pointer mr-[15px]">
          <input :value="productItem.selected" type="checkbox" class="sr-only" @change="$emit('select')" />
          <div
            class="flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded mt-px border transition-colors duration-300"
            :class="[
              productItem.selected
                ? 'bg-blue-500 border-blue-500 group-hover:bg-white'
                : 'bg-white  border-border group-hover:border-gray-300',
            ]"
          >
            <CheckIcon v-if="productItem.selected" class="w-4 text-white transition-colors duration-300 group-hover:text-blue-500" />
          </div>
        </label>
        <div class="flex items-center bg-green-500">
          <CheckCircleIcon class="w-4 h-4 mr-1" />
          <span class="text-[11px] leading-tight font-semibold font-Inter"> 16,000 in stock </span>
        </div>
      </div>
      <div v-else class="font-Inter font-semibold leading-[1.25]">
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
  <Teleport to="body">
    <Transition name="slide-from-top">
      <LayoutFavoritesModalsDelete v-if="deleteItem" :products="[productItem]" :delete-from-cart="true" @close="deleteItem = false" />
    </Transition>
    <Transition name="slide-from-top">
      <LayoutFavoritesModalsCopyMoveItems
        v-if="copyItems"
        :items="[productItem]"
        :target-folders="[]"
        action="copy"
        @close="copyItems = false"
      />
    </Transition>
    <Transition name="fade">
      <div
        v-if="deleteItem || copyItems"
        class="fixed z-[60] top-0 left-0 w-full h-full bg-[#333333]/30 backdrop-blur-[2px] cursor-pointer md:z-50"
        @click="
          deleteItem = false;
          copyItems = false;
        "
      />
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { storeToRefs } from 'pinia';
import type { FavoriteItem } from '~~/types';
import CheckIcon from '@/assets/icons/check.svg';
import CheckCircleIcon from '@/assets/icons/check-circle.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import InfoIcon from '@/assets/icons/info-circle.svg';
import TrashIcon from '@/assets/icons/trash-can.svg';
import { ProductAction } from '~/model/cart/response/cart.interface';
import type { ProductActionObject } from '~/model/cart/response/cart.interface';
import type { PriceConfigurationSettingsInterface } from '~/model/products/response/ProductResponse';
import { parseProductPriceConfiguration } from '~/helpers/prices.helper';
import { useCart } from '~/composables/useCart';
import { useAuthStore } from '~/store/authStore';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';

const props = defineProps({
  product: {
    type: Object as PropType<FavoriteItem>,
    required: true,
  },
  inModal: {
    type: Boolean,
    required: false,
  },
  inCart: {
    type: Boolean,
    required: false,
  },
});
const productItem = ref<FavoriteItem>(props.product);
const emits = defineEmits(['select', 'update-quantity', 'delete-product']);

const deleteItem = ref(false);
const copyItems = ref(false);

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
const thumbnailClass = computed(() =>
  props.inModal
    ? 'w-9 h-9 mr-2 flex-shrink-0 object-cover'
    : 'w-12 h-12 border border-border rounded-lg overflow-hidden object-cover mr-3 md:w-14 md:h-14 flex-shrink-0'
);

const getPricesConfiguration = () => {
  const discountsHelper = parseProductPriceConfiguration(props.product?.productEntity, getUserDetails.value, quantity.value);

  minPriceConfiguration.value = discountsHelper?.minimumOrderQuantityConfiguration;
  currentPriceConfiguration.value = discountsHelper?.priceConfiguration;
  discountPrice.value = discountsHelper?.discountPrice || 0;
  currentConfigurationDiscountPrice.value = discountsHelper?.currentConfigurationDiscountPrice || 0;
  userDiscount.value = discountsHelper?.userDiscount || 0;
  productDiscount.value = discountsHelper?.productDiscount || 0;
};

getPricesConfiguration();

const deleteItemFromCart = async () => {
  const payload = {
    products: [props.product?.id],
  };
  emits('delete-product', props.product);

  await removeFromCart(payload);
};

watch(
  productItem,
  (_value) => {
    getPricesConfiguration();
  },
  { deep: true }
);
</script>
