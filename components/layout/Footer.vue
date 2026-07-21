<template>
  <footer>
    <div class="bg-[#F5F5F5] pt-[30px] pb-6 md:pb-8">
      <div class="container">
        <div class="mb-8 md:flex md:items-start md:gap-[45px] md:mb-6 lg:justify-between">
          <div class="mb-[30px] md:mb-0">
            <NuxtLink to="/" class="mb-3 flex">
              <Logo class="w-[121px]" />
            </NuxtLink>
            <p class="max-w-[220px] text-sm leading-5 text-slate-500">
              Self-contained portfolio demo. No external services or social accounts required.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-5 md:flex md:flex-wrap md:gap-x-[30px] lg:gap-x-[50px]">
            <div v-for="(items, label, index) in navItems" :key="index" class="md:max-w-max md:last:ml-[94px] lg:last:ml-0">
              <div class="mb-[15px]">
                <div class="mb-1.5 text-sm font-semibold md:text-base">
                  {{ label }}
                </div>
                <div class="h-0.5 w-[38px] rounded-full bg-blue-500" />
              </div>
              <ul class="grid grid-cols-1 gap-[3px] md:gap-1.5">
                <li v-for="(navItem, navItemIndex) in items" :key="navItemIndex">
                  <NuxtLink
                    :to="navItem.to"
                    class="relative text-xs after:absolute after:-bottom-0.5 after:left-0 after:w-full after:h-0.5 after:bg-neutral-700 after:origin-right after:scale-x-0 after:rounded-full after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100 md:text-sm"
                  >
                    {{ navItem.label }}
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div>
          <p class="text-[15px] text-center text-slate-500">&copy; {{ new Date().getFullYear() }} ECAS</p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import Logo from '@/assets/media/logo.svg';
import { useAuthStore } from '~/store/authStore';

const authStore = useAuthStore();
const { token, userDetails } = storeToRefs(authStore);
const isSignedIn = computed(() => Boolean(token.value || userDetails.value));

const navItems = computed(() => ({
  Storefront: [
    {
      label: 'Home',
      to: '/',
    },
    {
      label: 'Browse products',
      to: '/search',
    },
    {
      label: 'View cart',
      to: '/cart',
    },
  ],
  'Review flows': [
    ...(isSignedIn.value
      ? []
      : [
          {
            label: 'Sign in to demo',
            to: '/?signin=true',
          },
        ]),
    {
      label: 'Track Order',
      to: '/order-tracking',
    },
    {
      label: 'Order History',
      to: isSignedIn.value ? '/dashboard/client?tab=orders' : '/?signin=true&redirect=%2Fdashboard%2Fclient%3Ftab%3Dorders',
    },
  ],
}));
</script>
