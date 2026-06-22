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
          class="rounded-lg w-8 h-8 bg-[#F2F2F2] flex items-center justify-center text-slate-500 flex-shrink-0 transition-colors duration-300 mt-4 ml-auto mr-4 mb-4 hover:text-blue-500"
          @click="$emit('close')"
        >
          <XIcon class="w-6 h-6" />
        </button>
        <div class="relative z-10 flex items-center gap-6 px-4 bg-white md:px-6">
          <button
            v-for="(item, index) in navItems"
            :key="index"
            :data-tab="textUtil.slugify(item.label)"
            class="relative flex items-center pb-3 transition-colors duration-300 hover:text-blue-500 md:text-base"
            :class="[activeNavItem === textUtil.slugify(item.label) ? 'text-blue-500' : 'text-neutral-700 after:opacity-0']"
            @click="setActiveNav(item.label)"
          >
            <component :is="item.icon" class="w-5 h-5 mr-2" />
            <span class="text-sm font-medium">
              {{ item.label }}
            </span>
          </button>
          <div
            class="absolute bottom-0 h-1 bg-blue-500 rounded-t-md transition-all duration-300"
            :style="{
              left: navLineLeftPosition + 'px',
              width: navLineWidth + 'px',
            }"
          />
        </div>
      </div>
      <div class="flex-1 h-[calc(100%-102px)]">
        <Favorites v-if="activeNavItem === 'favorites'" />
        <Cart v-else-if="activeNavItem === 'shopping-cart'" :data="data" @close="$emit('close')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import Favorites from './favorites/Index.vue';
import Cart from './cart/Index.vue';
import XIcon from '@/assets/icons/x.svg';
import CartIcon from '@/assets/icons/cart.svg';
import HeartIcon from '@/assets/icons/heart.svg';
import type { CartInterface } from '~/model/cart/response/cart.interface';

const props = defineProps({
  tab: {
    type: String as PropType<'favorites' | 'shopping-cart'>,
    required: false,
    default: 'favorites',
  },
  data: {
    type: Object as PropType<CartInterface>,
    required: true,
  },
});

defineEmits(['close']);
const elDOM = ref<HTMLElement | null>(null);

const navItems = ref([
  {
    label: 'Favorites',
    icon: HeartIcon,
  },
  {
    label: 'Shopping Cart',
    icon: CartIcon,
  },
]);

const activeNavItem = ref<'favorites' | 'shopping-cart'>(props.tab);
const navLineLeftPosition = ref(0);
const navLineWidth = ref(0);

const setNavLine = () => {
  if (elDOM.value) {
    const activeNavEl = elDOM.value.querySelector(`[data-tab=${activeNavItem.value}]`) as HTMLButtonElement;

    if (activeNavEl) {
      const rect = activeNavEl.getBoundingClientRect();
      navLineLeftPosition.value = activeNavEl.offsetLeft;
      navLineWidth.value = rect.width;
    }
  }
};

const setActiveNav = (item: string) => {
  activeNavItem.value = textUtil.slugify(item) as typeof activeNavItem.value;
  setNavLine();
};

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
