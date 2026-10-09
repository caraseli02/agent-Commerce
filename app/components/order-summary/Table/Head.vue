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
        <span v-if="selectedItems > 0" class="text-sm">
          {{ selectedItems }}
        </span>
      </div>
    </div>
    <div class="flex flex-row gap-9">
      <button
        type="button"
        class="group flex items-center disabled:pointer-events-none disabled:opacity-40"
        :disabled="!canDeleteSelected"
        :aria-disabled="!canDeleteSelected"
        @click="isOpen = true"
      >
        <TrashOutline class="text-slate-500 group-hover:text-rose-500 transition duration-150" />
        <span class="text-sm font-normal text-slate-500 ml-2 group-hover:text-rose-500 transition duration-150"> Delete Selected </span>
      </button>
      <CartDeleteDialog v-model="isOpen" :product-ids="selectedProductIds" @removed="onDeleted" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TrashOutline from '@/assets/icons/trash-outline.svg';
import CartDeleteDialog from '~/components/cart/CartDeleteDialog.vue';
import { useCartStore } from '~/store/cartStore';
import type { CartProductsInterface } from '~~/types/cart';

const checkAllBox = ref(false);
const isOpen = ref(false);

const cartStore = useCartStore();

const products = computed(() => cartStore.cart?.products ?? []);

const selectedProductIds = computed(() =>
  products.value.filter((product: CartProductsInterface) => product.selected).map((product) => product.id),
);

const selectedItems = computed(() => selectedProductIds.value.length);

const canDeleteSelected = computed(() => selectedItems.value > 0);

const totalItems = computed(() => products.value.length);

const syncCheckAllBox = () => {
  checkAllBox.value = totalItems.value > 0 && selectedItems.value === totalItems.value;
};

const toggleCheckAll = () => {
  checkAllBox.value = !checkAllBox.value;
  products.value.forEach((product: CartProductsInterface) => {
    product.selected = checkAllBox.value;
  });
};

const onDeleted = () => {
  checkAllBox.value = false;
  isOpen.value = false;
};

watch([selectedItems, totalItems], syncCheckAllBox);
</script>
