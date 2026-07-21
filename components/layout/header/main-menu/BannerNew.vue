<script setup lang="ts">
import BannerBg from '@/assets/media/home/banner-bg.jpg';
</script>

<template>
  <section
    class="relative h-full min-h-0 overflow-hidden rounded-xl border border-[#E1E4EA] bg-white"
    role="region"
    aria-labelledby="hero-title"
  >
    <img
      :src="BannerBg"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.14]"
      loading="lazy"
    >
    <div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-slate-50/95 to-slate-100/90" aria-hidden="true" />
    <div class="relative z-10 flex h-full flex-col justify-center px-8 py-10 lg:px-12 lg:py-12 xl:px-14">
      <div class="flex max-w-[520px] flex-col gap-5 text-zinc-800">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">ECAS procurement demo</p>
        <h1 id="hero-title" class="text-3xl font-bold leading-tight tracking-tight lg:text-4xl xl:text-[2.75rem] xl:leading-[1.15]">
          Source electronic components with confidence
        </h1>
        <p class="max-w-[460px] text-sm leading-6 text-slate-600 lg:text-base lg:leading-7">
          Review stock, compare part details, and move from product discovery to checkout in a clearer B2B buying flow.
        </p>
        <UiButton as-child class="mt-1 h-auto w-fit px-5 py-2.5 text-sm font-medium shadow-sm">
          <NuxtLink to="/search">Explore Products</NuxtLink>
        </UiButton>
      </div>
    </div>
  </section>
</template>
