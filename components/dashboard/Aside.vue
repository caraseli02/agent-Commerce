<template>
  <aside
    class="fixed top-0 left-0 z-40 bg-[#1B1B28] h-screen flex flex-col items-center"
    :class="[isCollapsedOnDesktop ? 'collapsed' : '']"
  >
    <Transition name="fade">
      <div
        v-if="showTopNavLayer && !isCollapsedOnDesktop"
        class="absolute top-[106px] left-0 w-full h-[52px] pointer-events-none bg-gradient-to-t from-transparent to-[#1b1b28] md:top-[112px]"
      />
    </Transition>
    <Transition name="fade">
      <div
        v-if="showBottomNavLayer && !isCollapsedOnDesktop"
        class="absolute left-0 bottom-[153px] w-full h-[52px] pointer-events-none bg-gradient-to-b from-transparent to-[#1b1b28]"
      />
    </Transition>
    <div
      class="flex items-center w-full transition-all duration-300"
      :class="[isCollapsedOnDesktop ? 'px-6 pt-6 pb-[96px] justify-center' : 'px-4 pt-6 pb-[50px] justify-between md:pb-[60px]']"
    >
      <NuxtLink v-if="isCollapsedOnDesktop" to="/" class="flex">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 28" class="w-[30px]">
          <path
            fill="#fff"
            d="M7.16 0C2.388 0 0 2.434 0 7.65v12.697C0 25.565 2.547 28 7.16 28h15.998c3.66 0 6.206-1.738 6.842-5.914l-.159-.172H8.115c-.953 0-1.431-.174-1.75-.52-.158-.176-.317-.696-.317-1.393V8c0-.697 0-1.248.318-1.567.433-.433.634-.346 1.75-.346H29.84c.159 0 .159-.174.159-.174-.636-4.174-3.181-5.912-6.842-5.912L7.161 0Z"
          />
          <path
            fill="#007FFF"
            d="m20.337 14.982-7.12 3.826c-.959.514-2.217-.064-2.217-1.019v-7.578c0-.95 1.246-1.53 2.205-1.024l7.12 3.752c.895.47.901 1.564.012 2.043Z"
          />
        </svg>
      </NuxtLink>
      <template v-else>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 142 28" class="w-[142px]">
          <path
            fill="#fff"
            d="M1.078 15.902c0 .346.154.52.307.691l.153.174c.308.344.613.344.92.344h16.689c.92 0 1.38-.69 1.38-1.554v-3.458c0-.171-.307-.69-.46-.69-.306-.347-.613-.347-.92-.347H2.61c-.306 0-.766 0-1.073.347l-.153.17a1.42 1.42 0 0 0-.307.866v3.457Z"
          />
          <path
            fill="#fff"
            d="M42.883.172c-4.818 0-7.227 2.419-7.227 7.603v12.618c0 5.186 2.57 7.605 7.227 7.605h16.143c3.694 0 6.263-1.727 6.905-5.877l-.16-.17H43.846c-.963 0-1.445-.174-1.766-.519-.16-.174-.32-.69-.32-1.383V8.122c0-.692.16-1.21.32-1.557.321-.17.803-.344 1.766-.344h21.925c.16 0 .16-.173.16-.173C65.289 1.9 62.72.173 59.026.173L42.883.172Z"
          />
          <path
            fill="#fff"
            d="M7.226.172C2.41.172 0 2.59 0 7.775v12.618c0 5.186 2.57 7.605 7.226 7.605H23.37c3.694 0 6.263-1.727 6.904-5.877l-.16-.17H8.19c-.963 0-1.445-.174-1.766-.519-.16-.174-.321-.69-.321-1.383V8.122c0-.692.16-1.21.321-1.557.321-.17.803-.344 1.766-.344h21.924c.16 0 .16-.173.16-.173C29.634 1.9 27.064.173 23.37.173L7.226.172Z"
          />
          <path
            fill="#fff"
            d="M120.4 0c-4.979 0-8.028 2.42-8.028 7.95s3.049 8.124 8.028 8.297l13.25 1.036c1.125 0 1.607.348 1.93.692.318.344.479.866.479 1.729 0 1.73-.802 2.075-2.248 2.075-3.372.173-6.26.173-9.152.173h-12.131c-.157 0-.157 0-.157.17.157 3.286 2.566 5.704 5.458 5.704h16.143c5.14 0 8.028-2.245 8.028-7.95 0-5.531-3.049-8.123-7.867-8.298l-13.255-1.036c-1.285 0-1.764-.344-2.086-.691-.323-.345-.484-.865-.484-1.727 0-.866.323-1.384.484-1.557.322-.344.801-.517 1.925-.517H142v-.175C142 2.593 139.752 0 136.703 0H120.4Z"
          />
          <path
            fill="#fff"
            d="M71.313 26.446c0 .517.16 1.036.48 1.21.322.17.643.17.803.17h3.854c.16 0 .322 0 .803-.17.32-.174.481-.521.642-.866l2.088-3.285 3.533-5.876 5.94-9.853c0-.172.161-.172.161 0l9.474 15.729 1.284 2.075.802 1.209c0 .173.322.692.803.865.16.171.321.171.642.171h3.854c.161 0 .482 0 .643-.17.481-.174.641-.693.641-1.21 0-.174-.16-.52-.321-.692L92.828 1.38C92.506.69 92.025.171 91.22.171h-3.533c-.16 0-.481.172-.642.345-.482.173-.642.518-.803.692L71.472 25.58c0 .344-.16.518-.16.866Z"
          />
          <path
            fill="#007FFF"
            d="m90.373 17.945 4.134 7.668c.556 1.031-.069 2.387-1.1 2.387h-8.188c-1.027 0-1.653-1.342-1.107-2.375l4.054-7.668c.508-.963 1.69-.97 2.207-.012Z"
          />
        </svg>
        <button class="flex items-center justify-center p-1 bg-[#2F3241] rounded-lg md:hidden" @click="$emit('close')">
          <XIcon class="w-6 h-6 text-gray-100" />
        </button>
        <button class="flex max-md:hidden" @click="$emit('close')">
          <CollapseIcon class="w-6 h-6" />
        </button>
      </template>
    </div>
    <nav
      ref="navDOM"
      class="w-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-custom mr-3 pb-4"
      :class="[isCollapsedOnDesktop ? 'mb-5' : 'h-full flex-1']"
    >
      <ul class="grid grid-cols-1" :class="[isCollapsedOnDesktop ? 'gap-2.5 pl-5 pr-1' : 'gap-1 pl-5 pr-2']">
        <li v-for="(item, index) in nav" :key="index">
          <NuxtLink
            v-if="item.to"
            :to="item.to"
            class="group flex items-center justify-between text-gray-100 p-3 rounded-lg transition-colors duration-300 hover:text-[#009FFF] hover:bg-[#2F3241]"
            :class="[isCollapsedOnDesktop ? 'justify-center w-12 h-12 mx-auto' : '']"
            @mouseenter="handleNavItemMouseEnter($event, item)"
            @mouseleave="hoveredNavItem = null"
          >
            <div class="flex items-center">
              <component :is="item.icon" class="w-6 h-6" />
              <span v-if="!isCollapsedOnDesktop" class="text-sm leading-[1.43] font-medium ml-3">
                {{ item.label }}
              </span>
            </div>
            <div
              v-if="item.count && !isCollapsedOnDesktop"
              class="px-2 rounded-md font-Inter text-xs font-medium leading-[2] text-gray-100 bg-[#2F3241] transition-colors duration-300 group-hover:bg-[#1B1B28]"
            >
              {{ item.count }}
            </div>
          </NuxtLink>
          <button
            v-else
            :disabled="isCollapsedOnDesktop"
            class="group flex items-center text-gray-100 rounded-lg transition-colors duration-300 hover:text-[#009FFF] hover:bg-[#2F3241] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-gray-100 disabled:hover:bg-transparent"
            :class="[
              item.dropdown?.show ? 'bg-[#2F3241]' : '',
              isCollapsedOnDesktop ? 'justify-center w-12 h-12 mx-auto' : 'justify-between p-3 w-full',
            ]"
            @click="handleItemDropdownToggle($event, item)"
            @mouseenter="handleNavItemMouseEnter($event, item)"
            @mouseleave="hoveredNavItem = null"
          >
            <div class="flex items-center">
              <component :is="item.icon" class="w-6 h-6" />
              <span v-if="!isCollapsedOnDesktop" class="text-sm leading-[1.43] font-medium ml-3">
                {{ item.label }}
              </span>
            </div>
            <div v-if="!isCollapsedOnDesktop" class="flex items-center">
              <div
                v-if="item.count"
                class="px-2 rounded-md font-Inter text-xs font-medium leading-[2] text-gray-100 mr-4 transition-colors duration-300 group-hover:bg-[#1B1B28]"
                :class="[item.dropdown?.show ? 'bg-[#1B1B28]' : 'bg-[#2F3241]']"
              >
                {{ item.count }}
              </div>
              <ChevronDownIcon
                class="w-5 h-5 text-gray-100 transition-transform duration-300"
                :class="[item.dropdown?.show ? 'rotate-180' : '']"
              />
            </div>
          </button>
          <Transition name="fade">
            <div v-if="item.dropdown?.show && !isCollapsedOnDesktop" class="py-2 bg-[#2F3241] rounded-lg mt-1">
              <NuxtLink
                v-for="(dropdownItem, dropdownIndex) in item.dropdown.items"
                :key="dropdownIndex"
                :to="dropdownItem.to"
                class="group flex items-center justify-between text-gray-100 px-3 py-2 transition-colors duration-300 hover:text-[#009FFF]"
              >
                <div class="flex items-center">
                  <component :is="dropdownItem.icon" class="w-6 h-6 mr-3" />
                  <span class="text-sm leading-[1.43] font-medium">
                    {{ dropdownItem.label }}
                  </span>
                </div>
                <div
                  v-if="'count' in dropdownItem && dropdownItem.count"
                  class="px-2 bg-[#1B1B28] rounded-md font-Inter text-xs font-medium leading-[2] text-gray-100 transition-colors duration-300 group-hover:text-[#009FFF]"
                >
                  {{ dropdownItem.count }}
                </div>
              </NuxtLink>
            </div>
          </Transition>
        </li>
      </ul>
    </nav>
    <button v-if="isCollapsedOnDesktop" class="mt-5 max-md:hidden" @click="$emit('close')">
      <Collapse2Icon class="w-6 h-6" />
    </button>
    <div class="w-full pt-5 px-4 pb-4 text-center" :class="[isCollapsedOnDesktop ? 'mt-2' : 'border-t border-[#2F3241]']">
      <div v-if="!isCollapsedOnDesktop" class="text-xs text-[#C2C5CD] leading-normal mb-1">© {{ new Date().getFullYear() }} ECAS Demo</div>
      <div class="text-xs leading-normal text-slate-500">V 1.0.0</div>
    </div>
    <Transition name="fade">
      <div
        v-if="isCollapsedOnDesktop && hoveredNavItem"
        class="absolute -right-2 translate-y-1/2 translate-x-full bg-[#1B1B28] rounded p-2 text-xs leading-tight font-Inter text-white min-w-max pointer-events-none"
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
          <path fill="#1B1B28" d="M5 8V0L1.496 2.336a2 2 0 0 0 0 3.328L5 8Z" />
        </svg>
      </div>
    </Transition>
  </aside>
</template>

<script setup lang="ts">
import { GanttChartSquareIcon } from 'lucide-vue-next';
import { markRaw } from 'vue';
import XIcon from '@/assets/icons/dashboard/x.svg';
import CollapseIcon from '@/assets/icons/dashboard/collapse.svg';
import Collapse2Icon from '@/assets/icons/dashboard/collapse-2.svg';
import OverviewIcon from '@/assets/icons/dashboard/overview.svg';
import ProductsIcon from '@/assets/icons/dashboard/products.svg';
import CategoriesIcon from '@/assets/icons/dashboard/categories.svg';
import CustomersIcon from '@/assets/icons/dashboard/customers.svg';
import OrdersIcon from '@/assets/icons/dashboard/orders.svg';
import SettingsIcon from '@/assets/icons/dashboard/setting.svg';
import ChevronDownIcon from '@/assets/icons/dashboard/chevron-down.svg';

defineProps({
  isCollapsedOnDesktop: {
    type: Boolean,
    required: false,
  },
});

defineEmits(['close']);

const navDOM = ref<HTMLElement>();
const showTopNavLayer = ref(false);
const showBottomNavLayer = ref(false);

const nav = ref([
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: markRaw(OverviewIcon),
  },
  {
    label: 'Products',
    icon: markRaw(ProductsIcon),
    count: '19,227',
    dropdown: {
      show: false,
      items: [
        {
          label: 'Categories',
          to: '/dashboard/products/categories',
          icon: markRaw(CategoriesIcon),
          count: '28',
        },
      ],
    },
  },
  {
    label: 'Customers',
    to: '/dashboard/customers',
    icon: markRaw(CustomersIcon),
    count: '9',
  },
  {
    label: 'Orders',
    to: '/dashboard/orders',
    icon: markRaw(OrdersIcon),
    count: '749',
  },
  {
    label: 'Settings',
    icon: markRaw(SettingsIcon),
    dropdown: {
      show: false,
      items: [
        {
          label: 'Smart Pricing',
          to: '/dashboard/settings/smart-price',
          icon: markRaw(GanttChartSquareIcon),
        },
      ],
    },
  },
]);

interface NavDropdownItem {
  label: string;
  to: string;
  icon: unknown;
  count?: string;
}

interface NavItem {
  label: string;
  to?: string;
  icon: unknown;
  count?: string;
  dropdown?: {
    show: boolean;
    items: NavDropdownItem[];
  };
}

const hoveredNavItem = ref<NavDropdownItem | NavItem | null>(null);
const hoveredNavItemTop = ref(0);

const handleNavItemMouseEnter = (event: MouseEvent, item: NavDropdownItem | NavItem) => {
  const target = event.target as HTMLElement;
  hoveredNavItem.value = item;
  hoveredNavItemTop.value = target.getBoundingClientRect().top;
};

const handleItemDropdownToggle = (event: MouseEvent, item: NavItem) => {
  if (item.dropdown) {
    item.dropdown.show = !item.dropdown.show;

    nextTick(() => {
      if (item.dropdown?.show) {
        (event.currentTarget as HTMLElement).nextElementSibling?.scrollIntoView({
          behavior: 'smooth',
        });
      }
    });
  }
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

<style lang="scss">
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
