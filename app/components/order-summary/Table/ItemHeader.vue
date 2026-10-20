<script setup lang="ts">
import { storeToRefs } from 'pinia';
import TrashIcon from '@/assets/icons/trash-can.svg';
import CheckIcon from '@/assets/icons/check.svg';
import OrangeCheckCircle from '@/assets/icons/orange-check-circle.svg';
import GreenCheckCircle from '@/assets/icons/green-check-circle.svg';
import ChevronDownIcon from '@/assets/icons/dashboard/chevron-down.svg';
import WarningError from '@/assets/icons/warning-error.svg';
import WarningErrorHuge from '@/assets/icons/warning-error-huge.svg';

import type { CartProductsInterface } from '~~/types/cart';
import { useAuthStore } from '~/store/authStore';
import { parseProductPriceConfiguration } from '~~/helpers/prices.helper';
import { useCartStore } from '~/store/cartStore';

const props = defineProps<{
  expanded: boolean;
  item: CartProductsInterface;
  stockItem: boolean;
  shortStock?: boolean;
  itemQuantity: number;
}>();

const emit = defineEmits<{
  toggleExpanded: [val: boolean];
  check: [val: CartProductsInterface];
  deleteItem: [val: boolean];
}>();

const handleExpand = () => {
  if (window.matchMedia('(max-width: 1280px)').matches) {
    emit('toggleExpanded', !props.expanded);
  }
};

const discounts = computed(() => {
  if (!props.item.productEntity) {
    return;
  }

  const discountsHelper = parseProductPriceConfiguration(props.item.productEntity, getUserDetails.value, props.itemQuantity);
  return {
    userDiscount: discountsHelper?.userDiscount || 0,
    productDiscount: discountsHelper?.productDiscount || 0,
  };
});

const authStore = useAuthStore();
const { getUserDetails } = storeToRefs(authStore);

const cartStore = useCartStore();

function checkCartItem(itemId: string) {
  const item = cartStore.cart?.products.find((product: CartProductsInterface) => product.id === itemId);
  if (item) {
    item.selected = !item.selected;
  }
}
</script>

<template>
  <div
    class="relative cursor-pointer xl:cursor-default flex flex-row justify-between p-4 bg-light-500 w-full border-[1px] border-light-500 header-transition"
    :class="expanded ? 'rounded-t-lg' : 'rounded-lg'"
    @click="handleExpand"
  >
    <div class="flex flex-row truncate">
      <label class="flex cursor-pointer mr-4">
        <input :value="item.selected" type="checkbox" class="sr-only" @change="checkCartItem(item.id)" />
        <div
          class="flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded mt-px border transition-colors duration-300"
          :class="[
            item.selected ? 'bg-blue-500 border-blue-500 group-hover:bg-white' : 'bg-white  border-border group-hover:border-gray-300',
          ]"
        >
          <CheckIcon v-if="item.selected" class="w-4 text-white transition-colors duration-300 group-hover:text-blue-500" />
        </div>
      </label>
      <div class="max-w-[220px] lg:max-w-[245px] flex">
        <span
          v-if="stockItem"
          class="truncate text-neutral-700 text-sm leading-6 font-normal self-center justify-self-center"
          :class="expanded && shortStock ? 'hidden sm:block' : 'block'"
          >{{ item.productEntity?.name }}</span
        >
        <span v-else class="block truncate text-rose-500 text-sm font-normal leading-6 self-center justify-self-center">{{
          item.productEntity?.alias
        }}</span>
      </div>
      <div v-if="shortStock" class="flex flex-row">
        <OrangeCheckCircle class="w-5 ml-2 sm:ml-4" :class="expanded ? 'ml-0' : ''" />
        <span class="text-orange-500 text-sm font-medium leading-6 self-center pl-2" :class="expanded ? 'flex sm:hidden' : 'hidden'"
          >{{ item.productEntity?.stock }} in stock</span
        >
      </div>
      <GreenCheckCircle v-if="!shortStock && stockItem" class="w-5 ml-2 sm:ml-4" />
      <div v-if="!stockItem" class="flex flex-row items-center ml-4">
        <WarningErrorHuge class="hidden lg:block" />
        <WarningError class="block lg:hidden" />
        <span class="hidden sm:flex text-sm font-medium leading-6 text-rose-500 ml-2"
          >{{ item.backorder_stock }} items will be on back order.</span
        >
      </div>
      <div
        v-if="stockItem && item.discount.value && discounts?.productDiscount"
        class="px-2 border-[1px] rounded-[25px] border-rose-500 bg-white ml-4 sm:flex items-center hidden"
      >
        <span class="text-xs font-semibold leading-5 text-rose-500">{{ item.discount.value }} %</span>
      </div>
    </div>
    <div>
      <div class="hidden xl:flex flex-row gap-4 ml-4">
        <button
          type="button"
          :aria-label="`Remove ${item.productEntity?.name || 'product'} from order`"
          class="flex text-slate-500 items-center justify-center ml-auto transition-colors duration-300 hover:text-rose-500"
          @click="emit('deleteItem', true)"
        >
          <TrashIcon class="w-5 h-5" />
        </button>
      </div>
      <ChevronDownIcon
        class="w-5 h-5 flex-shrink-0 roun ded-full transition duration-300 xl:hidden flex"
        :class="[expanded ? 'rotate-180 text-blue-500' : 'text-slate-500']"
      />
    </div>
  </div>
</template>

<style scoped></style>
