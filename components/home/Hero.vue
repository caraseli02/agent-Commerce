<!-- eslint-disable vue/no-v-html -->
<template>
  <section class="mb-10 max-md:pt-4 md:mb-14 xl:mb-16 overflow-hidden">
    <div class="container">
      <!-- Mobile Hero Banner (visible only on mobile) -->
      <div class="block md:hidden relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm mb-5 min-h-[320px]">
        <div class="absolute inset-0 bg-slate-50" />
        <div class="relative z-10 flex flex-col justify-center h-full px-6 py-9">
          <h1 class="text-3xl font-bold text-zinc-800 leading-tight mb-4">Electronic Components,<br />Sourced Reliably</h1>
          <p class="text-sm leading-6 text-slate-500 mb-7 max-w-xs">
            Browse thousands of parts from trusted manufacturers. Check stock, compare specs, and order with confidence.
          </p>
          <UiButton as-child class="w-fit px-6 py-2.5 text-sm font-medium shadow-sm">
            <NuxtLink to="/search">Explore Products</NuxtLink>
          </UiButton>
        </div>
      </div>
      <!-- Desktop category + banner popover (hidden on mobile) -->
      <PopoverContainer class="hidden md:block mb-5" />
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div
          v-for="(feature, index) in features"
          :key="index"
          class="flex min-h-[118px] flex-col items-start justify-center rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4 shadow-sm lg:min-h-[108px] lg:flex-row lg:items-center lg:gap-3 xl:px-5"
        >
          <component :is="feature.icon" class="w-8 h-8 mb-3 flex-shrink-0 md:w-10 md:h-10 lg:mb-0 xl:w-11 xl:h-11" />
          <div class="flex flex-col text-left text-slate-500 leading-[1.25]">
            <div class="text-sm font-semibold mb-1.5 text-slate-800 lg:text-[15px] xl:text-base" v-html="feature.title" />
            <div class="text-[11px] md:text-xs lg:text-[13px]" v-html="feature.description" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { markRaw } from 'vue';
import ProductsBoxIcon from '@/assets/icons/home/products-box.svg';
import FastDeliveryIcon from '@/assets/icons/home/delivery-truck.svg';
import CustomDevelopmentIcon from '@/assets/icons/home/custom-development.svg';
import CustomerSupportIcon from '@/assets/icons/home/customer-support.svg';
import PopoverContainer from '@/components/layout/header/main-menu/DektopPopoverContainer.vue';

const features = [
  {
    title: 'Over 10,000 products',
    description: 'Available online',
    icon: markRaw(ProductsBoxIcon),
  },
  {
    title: "Fast <br class='md:hidden' /><span class='hidden md:inline'>and Secure</span> Delivery",
    description: 'Reliable Couriers',
    icon: markRaw(FastDeliveryIcon),
  },
  {
    title: "<span class='md:hidden'>Custom Development</span><span class='hidden md:inline'>Research and Development</span>",
    description: "<span class='md:hidden'>Quality Growth</span><span class='hidden md:inline'>Software & Hardware</span>",
    icon: markRaw(CustomDevelopmentIcon),
  },
  {
    title: "<span class='hidden md:inline'>Skilled</span> Customer Support",
    description: "Available <span class='md:hidden'>24/7</span><span class='hidden md:inline'>online & on phone</span>",
    icon: markRaw(CustomerSupportIcon),
  },
];
</script>
