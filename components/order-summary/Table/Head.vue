<template>
  <div class="bg-light-500 p-4 rounded-lg flex sm:flex-row gap-6 sm:gap-0 flex-col justify-between">
    <div class="flex flex-row justify-between">
      <div class="flex justify-center items-center gap-2">
        <SharedTablesMicroCheckBoxAll :check-all="checkAllBox" @check-all="toggleCheckAll" />
        <span class="text-sm font-normal text-slate-500">Select All</span>
      </div>
      <div class="ml-9 flex gap-2 items-center">
        <span class="text-neutral-700 text-sm font-medium" />
        <span class="text-sm font-normal text-slate-500">Items selected</span>
        <span v-if="selectedItems && selectedItems > 1" class="text-sm">
          {{ selectedItems }}
        </span>
      </div>
    </div>
    <div class="flex flex-row gap-9">
      <UiDialog :open="isOpen" @update:open="isOpen = $event">
        <UiDialogTrigger class="flex">
          <TrashOutline class="text-slate-500 group-hover:text-rose-500 transition duration-150" />
          <span class="text-sm font-normal text-slate-500 ml-2 group-hover:text-rose-500 transition duration-150"> Delete Selected </span>
        </UiDialogTrigger>
        <UiDialogContent>
          <p class="text-xl mb-4">Delete all selected items?</p>
          <div class="flex gap-4 items-center">
            <UiButton class="w-full" @click="deleteSelected"> Confirm </UiButton>
            <UiButton class="w-full" variant="outline" @click="isOpen = !isOpen"> Cancel </UiButton>
          </div>
        </UiDialogContent>
      </UiDialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import TrashOutline from '@/assets/icons/trash-outline.svg';
import { useCart } from '~/composables/useCart';
import { useCartStore } from '~/store/cartStore';
import type { CartProductsInterface } from '~/types/cart';

const checkAllBox = ref(false);
const isOpen = ref(false);

const cartStore = useCartStore();
const { removeFromCart } = useCart();

const toggleCheckAll = () => {
  checkAllBox.value = !checkAllBox.value;
  cartStore.cart?.products.forEach((product: CartProductsInterface) => (product.selected = checkAllBox.value));
};

const deleteSelected = async () => {
  const itemsToDelete =
    cartStore.cart?.products?.filter((product: CartProductsInterface) => product.selected).map((product) => product.id) ?? [];

  await removeFromCart({ products: itemsToDelete });
};

const selectedItems = computed(() => cartStore.cart?.products?.filter((product: CartProductsInterface) => product.selected).length ?? 0);
</script>
