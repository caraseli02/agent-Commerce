<template>
  <div class="flex flex-col flex-1 max-w-full h-full">
    <div class="flex-1 h-full overflow-y-auto overscroll-contain scrollbar-thin max-h-vh px-4 py-4 md:px-6">
      <div class="grid grid-cols-1 gap-4">
        <CartProductItem v-for="item in items" :key="item.id" :product="item" @delete-product="deleteProduct" />
      </div>
    </div>
    <div
      class="px-4 pt-4 pb-6 md:p-6"
      :style="{
        boxShadow: '0px 0px 8px 0px rgba(133, 133, 133, 0.25)',
      }"
    >
      <div v-if="hasItems" class="flex items-center justify-between leading-[1.25] font-semibold mb-4 md:text-xl md:leading-[1.2] md:mb-6">
        <div>Subtotal</div>
        <div class="text-right">{{ getCartSubtotal.toFixed(2) }} Lei</div>
      </div>
      <NuxtLink
        v-if="hasItems"
        class="flex items-center justify-center gap-2 bg-blue-500 text-white rounded-lg px-[15px] py-2 leading-[1.75] font-medium w-full"
        to="/order-summary"
        @click="$emit('close')"
      >
        <CartIcon class="w-6 h-6" />
        <span> Go to Checkout </span>
      </NuxtLink>
      <NuxtLink
        v-else
        class="flex items-center justify-center gap-2 bg-light-500 text-slate-500 border border-slate-200 rounded-lg px-[15px] py-2 leading-[1.75] font-medium w-full transition-colors duration-300 hover:border-slate-300 hover:bg-slate-50"
        to="/search"
        @click="$emit('close')"
      >
        <span>Continue Shopping</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import CartIcon from '@/assets/icons/cart.svg';
import { useCart } from '~/composables/useCart';
import type { CartProductsInterface } from '~/types/cart';
import CartProductItem, { type CartLineItem } from '~/components/layout/favorites-cart-modal/cart/CartProductItem.vue';
import { useCartStore } from '~/store/cartStore';

defineEmits(['close']);

const cartStore = useCartStore();
const { removeFromCart } = useCart();
const { getCartSubtotal, cart } = storeToRefs(cartStore);

const items = ref<CartLineItem[]>([]);
const hasItems = computed(() => items.value.length > 0);

type ProductImageLike = { ProductImageSmall?: string | null } | Array<{ ProductImageSmall?: string | null } | null> | null | undefined;

function getCartProductThumbnail(item: CartProductsInterface) {
  const productImage = item.productEntity?.details?.ProductImage as ProductImageLike;
  const primaryImage = Array.isArray(productImage) ? productImage.find(Boolean) : productImage;

  return primaryImage?.ProductImageSmall || undefined;
}

const mapCartItems = () => {
  items.value = (cart.value?.products || []).map(
    (item: CartProductsInterface): CartLineItem => ({
      id: item.id,
      title: item.productEntity?.name ?? '',
      description: item.productEntity?.description,
      image: getCartProductThumbnail(item),
      productEntity: item.productEntity!,
      quantity: Number(item.stock) + Number(item.backorder_stock || 0),
    })
  );
};

watch(
  cart,
  () => {
    mapCartItems();
  },
  { deep: true, immediate: true }
);

const deleteProduct = async (object: { id: string }) => {
  try {
    await removeFromCart({ products: [object.id] });
  } catch (error) {
    console.error('Failed to remove cart item', error);
  }
};
</script>
