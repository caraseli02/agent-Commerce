<template>
  <div ref="elDOM" class="fixed z-[60] top-0 left-0 w-full h-screen pointer-events-none">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      class="relative z-10 flex flex-col ml-auto w-full h-full bg-white max-h-vh overflow-hidden pointer-events-auto md:w-[440px]"
    >
      <header
        class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 md:px-6"
        :style="{
          boxShadow: '0px 0px 8px 0px rgba(133, 133, 133, 0.25)',
        }"
      >
        <div class="flex min-w-0 items-center gap-2">
          <CartIcon class="h-5 w-5 shrink-0 text-blue-500" aria-hidden="true" />
          <h2 id="cart-drawer-title" class="truncate text-sm font-medium text-blue-500">Shopping Cart</h2>
        </div>
        <button
          type="button"
          class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-light-300 text-slate-500 transition-colors duration-300 hover:bg-light-400 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Close shopping cart"
          @click="$emit('close')"
        >
          <XIcon class="h-5 w-5" />
        </button>
      </header>
      <div class="flex min-h-0 flex-1 flex-col">
        <Cart :data="data" @close="$emit('close')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import Cart from './cart/Index.vue';
import XIcon from '@/assets/icons/x.svg';
import CartIcon from '@/assets/icons/cart.svg';
import type { CartInterface } from '~/types/cart';

defineProps({
  data: {
    type: Object as PropType<CartInterface>,
    required: true,
  },
});

defineEmits(['close']);
const elDOM = ref<HTMLElement | null>(null);

onMounted(() => {
  document.body.style.overflow = 'hidden';
  document.body.style.maxHeight = '100vh';
  documentUtil.toggleBodyScroll();
});

onBeforeUnmount(() => {
  documentUtil.toggleBodyScroll();
  document.body.style.overflow = 'auto';
  document.body.style.maxHeight = '100%';
});
</script>
