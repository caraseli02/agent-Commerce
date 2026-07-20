<template>
  <footer>
    <div class="bg-slate-500 py-[15px]">
      <div class="container">
        <div class="text-white md:flex md:items-center md:justify-between">
          <div class="mb-[9px] md:mb-0 xl:flex xl:items-center">
            <div class="text-sm font-semibold md:text-base xl:text-2xl xl:font-normal xl:mr-[90px]">Try the newsletter demo</div>
            <p class="text-xs xl:text-base">See a complete form state without sending your address anywhere.</p>
          </div>
          <form
            class="mt-4 flex w-full max-w-md flex-col gap-2 rounded-md shadow-xs sm:mt-0 sm:flex-row sm:gap-0 md:w-auto"
            @submit.prevent="handleNewsletterSubmit"
          >
            <label for="footer-newsletter-email" class="flex min-w-0 flex-1 flex-col">
              <span class="sr-only">Newsletter email address</span>
              <input
                id="footer-newsletter-email"
                v-model="email"
                type="email"
                placeholder="Enter your email address"
                autocomplete="email"
                required
                class="w-full rounded-md bg-white px-4 py-[11px] text-sm font-medium text-neutral-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:rounded-l-md sm:rounded-r-none md:w-[250px] lg:w-[280px] 2xl:w-[350px]"
              />
            </label>
            <button
              type="submit"
              class="flex min-h-11 w-full flex-shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-blue-500 px-[14px] py-[11px] text-sm font-medium sm:w-auto sm:rounded-l-none sm:rounded-r-md"
            >
              {{ isSubscribed ? 'Saved for this visit' : 'Try subscription' }}
            </button>
          </form>
          <p v-if="newsletterMessage" class="mt-2 text-xs md:ml-4 md:mt-0" role="status" aria-live="polite">
            {{ newsletterMessage }}
          </p>
        </div>
      </div>
    </div>
    <div class="bg-[#F5F5F5] pt-[30px] pb-2.5">
      <div class="container">
        <div class="mb-[74px] md:flex md:items-start md:gap-[45px] md:mb-8 lg:justify-between lg:mb-[60px]">
          <div class="mb-[30px] md:mb-0">
            <NuxtLink to="/" class="flex">
              <Logo class="w-[121px] mb-5 md:mb-[87px] lg:mb-[67px]" />
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
import { computed, ref } from 'vue';
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

const email = ref('');
const isSubscribed = ref(false);
const newsletterMessage = ref('');

const handleNewsletterSubmit = () => {
  isSubscribed.value = true;
  newsletterMessage.value = 'Demo complete — your email stays in this browser and is not sent.';
};
</script>
