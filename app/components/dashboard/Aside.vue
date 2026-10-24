<template>
  <aside
    class="dashboard-aside fixed top-0 left-0 z-40 bg-(--sidebar) h-screen flex flex-col items-center"
    :class="[isCollapsedOnDesktop ? 'collapsed' : '']"
  >
    <Transition name="fade">
      <div
        v-if="showTopNavLayer && !isCollapsedOnDesktop"
        class="absolute top-[106px] left-0 w-full h-[52px] pointer-events-none bg-gradient-to-t from-transparent to-(--sidebar) md:top-[112px]"
      />
    </Transition>
    <Transition name="fade">
      <div
        v-if="showBottomNavLayer && !isCollapsedOnDesktop"
        class="absolute left-0 bottom-[153px] w-full h-[52px] pointer-events-none bg-gradient-to-b from-transparent to-(--sidebar)"
      />
    </Transition>
    <div
      class="flex items-center w-full transition-[padding] duration-200"
      :class="[isCollapsedOnDesktop ? 'px-6 pt-6 pb-[96px] justify-center' : 'px-4 pt-6 pb-[50px] justify-between md:pb-[60px]']"
    >
      <NuxtLink to="/" class="flex text-white" aria-label="Components Marketplace home">
        <LogoSmall v-if="isCollapsedOnDesktop" class="w-8 h-8" aria-hidden="true" />
        <Logo v-else class="w-[102px] h-8" aria-hidden="true" />
      </NuxtLink>
      <template v-if="!isCollapsedOnDesktop">
        <UiButton
          variant="ghost"
          size="icon"
          class="flex h-auto w-auto p-1 rounded-lg md:hidden"
          aria-label="Close navigation"
          @click="$emit('close')"
        >
          <XIcon class="w-6 h-6 text-gray-100" />
        </UiButton>
        <UiButton variant="ghost" class="flex h-auto p-0 max-md:hidden" aria-label="Collapse navigation" @click="$emit('close')">
          <CollapseIcon class="w-6 h-6" />
        </UiButton>
      </template>
    </div>
    <nav
      ref="navDOM"
      aria-label="Dashboard"
      class="w-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-custom mr-3 pb-4"
      :class="[isCollapsedOnDesktop ? 'mb-5' : 'h-full flex-1']"
    >
      <ul class="grid grid-cols-1" :class="[isCollapsedOnDesktop ? 'gap-2.5 pl-5 pr-1' : 'gap-1 pl-5 pr-2']">
        <li v-for="item in nav" :key="item.to">
          <NuxtLink
            :to="item.to"
            :aria-label="isCollapsedOnDesktop ? item.label : undefined"
            :aria-current="isActive(item) ? 'page' : undefined"
            class="group flex items-center text-gray-100 p-3 rounded-lg transition-colors duration-200 hover:text-(--sidebar-accent) hover:bg-(--sidebar-hover) aria-[current=page]:bg-(--sidebar-hover) aria-[current=page]:text-white"
            :class="[isCollapsedOnDesktop ? 'justify-center w-12 h-12 mx-auto' : '']"
            @mouseenter="handleNavItemMouseEnter($event, item)"
            @mouseleave="hoveredNavItem = null"
          >
            <component :is="item.icon" class="w-6 h-6 shrink-0" aria-hidden="true" />
            <span v-if="!isCollapsedOnDesktop" class="text-sm leading-[1.43] font-medium ml-3">
              {{ item.label }}
            </span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
    <UiButton
      v-if="isCollapsedOnDesktop"
      variant="ghost"
      class="h-auto p-0 mt-5 max-md:hidden"
      aria-label="Expand navigation"
      @click="$emit('close')"
    >
      <Collapse2Icon class="w-6 h-6" />
    </UiButton>
    <div class="w-full pt-5 px-4 pb-4 text-center" :class="[isCollapsedOnDesktop ? 'mt-2' : 'border-t border-(--sidebar-hover)']">
      <div v-if="!isCollapsedOnDesktop" class="text-xs text-(--sidebar-muted) leading-normal mb-1">
        © {{ new Date().getFullYear() }} Components Marketplace Demo
      </div>
      <div class="text-xs leading-normal text-(--sidebar-muted)">V 1.0.0</div>
    </div>
    <Transition name="fade">
      <div
        v-if="isCollapsedOnDesktop && hoveredNavItem"
        class="absolute -right-2 translate-y-1/2 translate-x-full bg-(--sidebar) rounded p-2 text-xs leading-tight font-Inter text-white min-w-max pointer-events-none"
        :style="{
          top: `${hoveredNavItemTop - 7}px`,
        }"
      >
        <span>
          {{ hoveredNavItem.label }}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 5 8"
          class="absolute top-1/2 left-px -translate-x-full -translate-y-1/2 w-2"
        >
          <path fill="var(--sidebar)" d="M5 8V0L1.496 2.336a2 2 0 0 0 0 3.328L5 8Z" />
        </svg>
      </div>
    </Transition>
  </aside>
</template>

<script setup lang="ts">
import { markRaw } from 'vue';
import Logo from '@/assets/media/logo.svg';
import LogoSmall from '@/assets/media/logo-sm.svg';
import XIcon from '@/assets/icons/dashboard/x.svg';
import CollapseIcon from '@/assets/icons/dashboard/collapse.svg';
import Collapse2Icon from '@/assets/icons/dashboard/collapse-2.svg';
import OverviewIcon from '@/assets/icons/dashboard/overview.svg';
import ProductsIcon from '@/assets/icons/dashboard/products.svg';
import CategoriesIcon from '@/assets/icons/dashboard/categories.svg';
import CustomersIcon from '@/assets/icons/dashboard/customers.svg';
import OrdersIcon from '@/assets/icons/dashboard/orders.svg';

defineProps({
  isCollapsedOnDesktop: {
    type: Boolean,
    required: false,
  },
});

defineEmits(['close']);

interface NavItem {
  label: string;
  to: string;
  icon: unknown;
  // Exact-match items stay inactive on their child routes (Dashboard, Products).
  exact?: boolean;
}

const route = useRoute();
const navDOM = ref<HTMLElement>();
const showTopNavLayer = ref(false);
const showBottomNavLayer = ref(false);

const nav: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: markRaw(OverviewIcon), exact: true },
  { label: 'Orders', to: '/dashboard/orders', icon: markRaw(OrdersIcon) },
  { label: 'Customers', to: '/dashboard/customers', icon: markRaw(CustomersIcon) },
  { label: 'Products', to: '/dashboard/products', icon: markRaw(ProductsIcon), exact: true },
  { label: 'Categories', to: '/dashboard/products/categories', icon: markRaw(CategoriesIcon) },
];

const isActive = (item: NavItem) => (item.exact ? route.path === item.to : route.path === item.to || route.path.startsWith(`${item.to}/`));

const hoveredNavItem = ref<NavItem | null>(null);
const hoveredNavItemTop = ref(0);

const handleNavItemMouseEnter = (event: MouseEvent, item: NavItem) => {
  const target = event.target as HTMLElement;
  hoveredNavItem.value = item;
  hoveredNavItemTop.value = target.getBoundingClientRect().top;
};

const handleNavScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  if (target.scrollTop > 0) {
    showTopNavLayer.value = true;
  } else if (!target.scrollTop) {
    showTopNavLayer.value = false;
  }
  if (target.scrollHeight - target.scrollTop === target.clientHeight) {
    showBottomNavLayer.value = false;
  } else {
    showBottomNavLayer.value = true;
  }
};

onMounted(() => {
  if (navDOM.value) {
    navDOM.value.addEventListener('scroll', handleNavScroll);
  }
});

onBeforeUnmount(() => {
  if (navDOM.value) {
    navDOM.value.removeEventListener('scroll', handleNavScroll);
  }
});
</script>

<style>
@reference "../../assets/css/main.css";
/* Sidebar palette lives here until main.css grows --sidebar tokens. */
.dashboard-aside {
  --sidebar: #1b1b28;
  --sidebar-hover: #2f3241;
  --sidebar-muted: #a8acbf;
  --sidebar-accent: #5cb8ff;
}

.scrollbar-custom {
  &::-webkit-scrollbar-thumb {
    background-color: #383b4d !important;
    border-radius: 100px !important;
  }

  @supports (scrollbar-color: red blue) {
    scrollbar-color: #383b4d transparent;
  }
}

.collapsed {
  & + main {
    & > div {
      @apply 2xl:px-6;
    }
  }
}
</style>
