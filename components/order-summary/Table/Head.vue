<template>
  <div class="bg-light-500 p-4 rounded-lg flex sm:flex-row gap-6 sm:gap-0 flex-col justify-between">
    <div class="flex flex-row justify-between">
      <div class="flex justify-center items-center gap-2">
        <SharedTablesMicroCheckBoxAll
          :check-all="checkAllBox"
          @check-all="toggleCheckAll"
        />
        <span class="text-sm font-normal text-slate-500">Select All</span>
      </div>
      <div class="ml-9 flex gap-2 items-center">
        <span class="text-neutral-700 text-sm font-medium" />
        <span class="text-sm font-normal text-slate-500">Items selected</span>
        <span
          v-if="selectedItems && selectedItems > 1"
          class="text-sm"
        >
          {{ selectedItems }}
        </span>
      </div>
    </div>
    <div class="flex flex-row gap-9">
      <button
        class="relative flex group"
        @click="toggleFavs"
      >
        <HeartSolid
          v-show="liked"
          class="absolute r-0 top-[1px] text-blue-500"
        />
        <HeartOutline class="w-5 h-5 text-slate-500 group-hover:text-blue-500 transition duration-150" />
        <span class="text-sm font-normal text-slate-500 ml-2 group-hover:text-blue-500 transition duration-150">
          Add to Favourites
        </span>
      </button>

      <UiDialog
        :open="isOpen"
        @update:open="isOpen = $event"
      >
        <UiDialogTrigger class="flex">
          <TrashOutline class="text-slate-500 group-hover:text-rose-500 transition duration-150" />
          <span class="text-sm font-normal text-slate-500 ml-2 group-hover:text-rose-500 transition duration-150">
            Delete Selected
          </span>
        </UiDialogTrigger>
        <UiDialogContent>
          <p class="text-xl mb-4">
            Delete all selected items?
          </p>
          <div class="flex gap-4 items-center">
            <UiButton
              class="w-full"
              @click="deleteSelected"
            >
              Confirm
            </UiButton>
            <UiButton
              class="w-full"
              variant="outline"
              @click="isOpen = !isOpen"
            >
              Cancel
            </UiButton>
          </div>
        </UiDialogContent>
      </UiDialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useNuxtApp } from '#app';
import HeartOutline from '@/assets/icons/heart-outline.svg';
import HeartSolid from '@/assets/icons/heart-solid.svg';
import TrashOutline from '@/assets/icons/trash-outline.svg';
import { useCartStore } from '~/store/cartStore';
import type { CartProductsInterface } from '~/model/cart/response/cart.interface';

// Reactive properties
const checkAllBox = ref(false);
const liked = ref(false);
const isOpen = ref(false);

const cartStore = useCartStore();

// Methods to toggle states and emit events
const toggleCheckAll = () => {
  checkAllBox.value = !checkAllBox.value;
  cartStore.cart?.products.forEach((product: CartProductsInterface) => (product.selected = checkAllBox.value));
};

const toggleFavs = () => {
  liked.value = !liked.value;
  cartStore.cart?.products.forEach((product: CartProductsInterface) => {
    if (product.selected) {
      product.liked = liked.value;
    }
  });
};

const { $api } = useNuxtApp();
const deleteSelected = async () => {
  const itemsToDelete
        = cartStore.cart?.products?.filter((product: CartProductsInterface) => product.selected).map(product => product.id) ?? [];

  const removed = (await $api.cart.removeEntityFromCart({ products: itemsToDelete })) as { status: string };

  if (removed.status === 'success') {
    await cartStore.updateAndReturnCart();
  }
};

const selectedItems = computed(() => cartStore.cart?.products?.filter((product: CartProductsInterface) => product.selected).length ?? 0);
</script>
