<template>
  <footer>
    <div class="bg-muted pt-[30px] pb-6 md:pb-8">
      <div class="container">
        <div class="mb-8 md:flex md:items-start md:gap-[45px] md:mb-6 lg:justify-between">
          <div class="mb-[30px] md:mb-0">
            <NuxtLink to="/" aria-label="Components Marketplace home" class="mb-3 flex">
              <Logo class="w-[121px]" />
            </NuxtLink>
            <p class="max-w-[220px] text-sm leading-5 text-muted-foreground">Portfolio demo with sample products and accounts.</p>
          </div>
          <div class="grid grid-cols-2 gap-5 md:flex md:flex-wrap md:gap-x-[30px] lg:gap-x-[50px]">
            <div v-for="(items, label, index) in navItems" :key="index" class="md:max-w-max md:last:ml-[94px] lg:last:ml-0">
              <div class="mb-1 text-sm font-semibold md:mb-[15px] md:text-base">
                {{ label }}
              </div>
              <!-- 44px rows on touch layouts; the compact desktop rhythm returns from md. -->
              <ul class="grid grid-cols-1 md:gap-1.5">
                <li v-for="(navItem, navItemIndex) in items" :key="navItemIndex">
                  <NuxtLink :to="navItem.to" class="group inline-flex min-h-11 items-center text-xs md:min-h-0 md:text-sm">
                    <span
                      class="relative after:absolute after:-bottom-0.5 after:left-0 after:w-full after:h-0.5 after:bg-foreground after:origin-right after:scale-x-0 after:rounded-full after:transition-transform after:duration-200 after:ease-out group-hover:after:origin-left group-hover:after:scale-x-100"
                    >
                      {{ navItem.label }}
                    </span>
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div>
          <p class="text-[15px] text-center text-muted-foreground">&copy; {{ new Date().getFullYear() }} Components Marketplace</p>
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
const { token } = storeToRefs(authStore);
const isSignedIn = computed(() => Boolean(token.value));

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
