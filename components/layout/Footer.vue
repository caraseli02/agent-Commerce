<template>
  <footer>
    <div class="bg-slate-500 py-[15px]">
      <div class="container">
        <div class="text-white md:flex md:items-center md:justify-between">
          <div class="mb-[9px] md:mb-0 xl:flex xl:items-center">
            <div class="text-sm font-semibold md:text-base xl:text-2xl xl:font-normal xl:mr-[90px]">Subscribe to our Newsletter</div>
            <p class="text-xs xl:text-base">Procurement updates, stock notices, and availability alerts for your team.</p>
          </div>
          <form
            class="mt-4 flex w-full max-w-md flex-col gap-2 rounded-md shadow-xs sm:mt-0 sm:flex-row sm:gap-0 md:w-auto"
            @submit.prevent
          >
            <label for="footer-newsletter-email" class="flex min-w-0 flex-1 flex-col">
              <span class="sr-only">Newsletter email address</span>
              <input
                id="footer-newsletter-email"
                v-model="email"
                type="email"
                placeholder="Enter your email address"
                autocomplete="email"
                class="w-full rounded-md bg-white px-4 py-[11px] text-sm font-medium text-neutral-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:rounded-l-md sm:rounded-r-none md:w-[250px] lg:w-[280px] 2xl:w-[350px]"
              />
            </label>
            <button
              type="submit"
              class="flex w-full flex-shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-blue-500 px-[14px] py-[11px] text-sm font-medium sm:w-auto sm:rounded-l-none sm:rounded-r-md"
            >
              Subscribe
            </button>
          </form>
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
            <div>
              <div class="text-sm mb-2.5 lg:text-base">Follow Us</div>
              <div class="flex items-center gap-2">
                <span
                  v-for="network in socialNetworks"
                  :key="network.label"
                  class="flex items-center justify-center w-[38px] h-[38px] rounded-full bg-slate-500/10 text-slate-500"
                  :title="`${network.label} (demo)`"
                  aria-hidden="true"
                >
                  <component :is="network.icon" class="w-5" />
                </span>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-5 md:flex md:flex-wrap md:gap-x-[30px] lg:gap-x-[50px]">
            <div v-for="(items, label, index) in navItems" :key="index" class="md:max-w-max md:last:ml-[94px] lg:last:ml-0">
              <div class="mb-2 md:mb-[15px]">
                <div class="text-sm font-semibold mb-0.5 md:text-base md:mb-1.5">
                  {{ label }}
                </div>
                <div class="w-[38px] h-0.5 bg-blue-500 rounded-full md:h-1" />
              </div>
              <ul class="grid grid-cols-1 gap-[3px] md:gap-1.5">
                <li v-for="(navItem, navItemIndex) in items" :key="navItemIndex">
                  <NuxtLink
                    v-if="navItem.to.startsWith('/')"
                    :to="navItem.to"
                    class="relative text-xs after:absolute after:-bottom-0.5 after:left-0 after:w-full after:h-0.5 after:bg-neutral-700 after:origin-right after:scale-x-0 after:rounded-full after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100 md:text-sm"
                  >
                    {{ navItem.label }}
                  </NuxtLink>
                  <a
                    v-else
                    :href="navItem.to"
                    class="relative text-xs after:absolute after:-bottom-0.5 after:left-0 after:w-full after:h-0.5 after:bg-neutral-700 after:origin-right after:scale-x-0 after:rounded-full after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100 md:text-sm"
                    :class="navItem.to.startsWith('tel:') ? 'whitespace-nowrap' : ''"
                  >
                    {{ navItem.label }}
                  </a>
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
import Logo from '@/assets/media/logo.svg';
import TwitterIcon from '@/assets/icons/social/twitter.svg';
import LinkedInIcon from '@/assets/icons/social/linkedin.svg';
import InstagramIcon from '@/assets/icons/social/instagram.svg';
import DiscordIcon from '@/assets/icons/social/discord.svg';
import TelegramIcon from '@/assets/icons/social/telegram.svg';

const socialNetworks = [
  { label: 'Twitter', icon: TwitterIcon },
  { label: 'LinkedIn', icon: LinkedInIcon },
  { label: 'Instagram', icon: InstagramIcon },
  { label: 'Discord', icon: DiscordIcon },
  { label: 'Telegram', icon: TelegramIcon },
];

const navItems = {
  General: [
    {
      label: 'About Us',
      to: '/',
    },
    {
      label: 'Careers',
      to: '/',
    },
    {
      label: 'Contact',
      to: '/',
    },
  ],
  'Quick Links': [
    {
      label: 'BOM',
      to: '/',
    },
    {
      label: 'Track Order',
      to: '/',
    },
    {
      label: 'Order History',
      to: '/',
    },
    {
      label: 'Return a product',
      to: '/',
    },
    {
      label: 'Delivery Information',
      to: '/',
    },
  ],
  'Customer Service': [
    {
      label: 'Sales: +1 800 555 0199',
      to: 'tel:+1 800 555 0199',
    },
    {
      label: 'Technical: +1 800 555 0199',
      to: 'tel:+1 800 555 0199',
    },
    {
      label: 'FAQs',
      to: '/',
    },
    {
      label: 'Help',
      to: '/',
    },
  ],
  'Terms & Conditions': [
    {
      label: 'Terms of use',
      to: '/',
    },
    {
      label: 'Terms of sale',
      to: '/',
    },
    {
      label: 'Privacy policy',
      to: '/',
    },
    {
      label: 'Trademarks',
      to: '/',
    },
  ],
};

const email = ref('');
</script>
