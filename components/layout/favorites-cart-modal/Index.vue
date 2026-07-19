<template>
  <div ref="elDOM" class="fixed z-[60] top-0 left-0 w-full h-screen pointer-events-none">
    <div class="relative z-10 flex flex-col ml-auto w-full h-full bg-white max-h-vh overflow-hidden pointer-events-auto md:w-[440px]">
      <div
        class="flex flex-col"
        :style="{
          boxShadow: '0px 0px 8px 0px rgba(133, 133, 133, 0.25)',
        }"
      >
        <button
          class="mt-4 ml-auto mr-4 mb-4 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#F2F2F2] text-slate-500 transition-colors duration-300 leading-none hover:text-blue-500"
          aria-label="Close shopping cart"
          @click="$emit('close')"
        >
          <XIcon class="w-5 h-5" />
        </button>
        <div class="relative z-10 flex items-center gap-2 px-4 pb-3 bg-white md:px-6">
          <CartIcon class="w-5 h-5 mr-2 text-blue-500" />
          <span class="text-sm font-medium text-blue-500">Shopping Cart</span>
        </div>
      </div>
      <div class="flex-1 h-[calc(100%-102px)]">
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
