<template>
  <div class="flex flex-col flex-1 max-w-full h-full">
    <div class="py-4 px-4 flex-1 h-full overflow-y-auto overscroll-contain scrollbar-thin max-h-vh md:py-6">
      <div class="grid grid-cols-1 gap-4">
        <LayoutFavoritesCartModalFavoritesProductItem
          v-for="item in items"
          :key="item.id"
          :product="item"
          in-cart
          @delete-product="deleteProduct"
        />
      </div>
    </div>
    <div
      class="px-4 pt-4 pb-6 md:p-6"
      :style="{
        boxShadow: '0px 0px 8px 0px rgba(133, 133, 133, 0.25)',
      }"
    >
      <div class="flex items-center justify-between leading-[1.25] font-semibold mb-4 md:text-xl md:leading-[1.2] md:mb-6">
        <div>Subtotal</div>
        <div class="text-right">{{ getCartSubtotal.toFixed(2) }} Lei</div>
      </div>
      <NuxtLink
        class="flex items-center justify-center gap-2 bg-blue-500 text-white rounded-lg px-[15px] py-2 leading-[1.75] font-medium w-full"
        :to="'/order-summary'"
        @click="$emit('close')"
      >
        <CartIcon class="w-6 h-6" />
        <span> Go to Checkout </span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import CartIcon from '@/assets/icons/cart.svg';
import type { PropType } from 'vue';
import { useCart } from '~/composables/useCart';
import type { CartInterface, CartProductsInterface } from '~/model/cart/response/cart.interface';
import type { FavoriteItem } from '~/types/favorites/item';
import { useCartStore } from '~/store/cartStore';

const props = defineProps({
  data: {
    type: Object as PropType<CartInterface>,
    required: true,
  },
});

defineEmits(['close']);

const cartStore = useCartStore();
const { removeFromCart } = useCart();
const { getCartSubtotal, cart } = storeToRefs(cartStore);

const items = ref<FavoriteItem[]>([]);

type ProductImageLike = { ProductImageSmall?: string | null } | Array<{ ProductImageSmall?: string | null } | null> | null | undefined;

function getCartProductThumbnail(item: CartProductsInterface) {
  const productImage = item.productEntity?.details?.ProductImage as ProductImageLike;
  const primaryImage = Array.isArray(productImage) ? productImage.find(Boolean) : productImage;

  return primaryImage?.ProductImageSmall || undefined;
}

const mapCartItems = () => {
  items.value = (cart.value?.products || []).map(
    (item: CartProductsInterface): FavoriteItem => ({
      id: item.id,
      type: item.isFolder ? 'folder' : 'product',
      title: item.productEntity?.name ?? '',
      description: item.productEntity?.description,
      image: getCartProductThumbnail(item),
      productEntity: item.productEntity ?? ({} as FavoriteItem['productEntity']),
      quantity: Number(item.stock) + Number(item.backorder_stock || 0),
    })
  );
};

watch(
  () => props.data,
  (nextCart) => {
    if (nextCart) {
      cartStore.setCart(nextCart);
    }
  },
  { deep: true, immediate: true }
);

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
