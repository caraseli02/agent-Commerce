<template>
  <footer class="bg-[hsl(31_11%_9%)] text-[hsl(40_10%_94%)] dark:border-t dark:border-border dark:bg-sidebar">
    <div class="container pb-6 pt-12 md:pb-8 md:pt-14">
      <div class="mb-10 grid gap-10 md:mb-12 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16">
        <div class="max-w-xs">
          <NuxtLink
            to="/"
            aria-label="Components Marketplace home"
            class="mb-4 inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(31_11%_9%)]"
          >
            <LayoutBrandLogo aria-hidden="true" />
          </NuxtLink>
          <p class="text-sm leading-6 text-[hsl(37_5%_68%)]">Portfolio demo with sample products and accounts.</p>
        </div>
        <div class="grid grid-cols-2 gap-6 sm:gap-x-16">
          <div v-for="(items, label, index) in navItems" :key="index">
            <div class="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(37_5%_68%)] md:mb-3">
              {{ label }}
            </div>
            <!-- 44px rows on touch layouts; the compact desktop rhythm returns from md. -->
            <ul class="grid grid-cols-1 md:gap-2">
              <li v-for="(navItem, navItemIndex) in items" :key="navItemIndex">
                <NuxtLink
                  :to="navItem.to"
                  class="group inline-flex min-h-11 items-center rounded-sm text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0"
                >
                  <span
                    class="relative after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-signal after:transition-transform after:duration-200 after:ease-out group-hover:after:origin-left group-hover:after:scale-x-100 motion-reduce:after:transition-none"
                  >
                    {{ navItem.label }}
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div
        class="flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-[hsl(37_5%_68%)] sm:flex-row sm:items-center sm:justify-between"
      >
        <p>&copy; {{ new Date().getFullYear() }} Components Marketplace</p>
        <p class="flex items-center gap-2">
          <span class="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden="true" />
          Sample catalog and test checkout. No real orders or payments.
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
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
