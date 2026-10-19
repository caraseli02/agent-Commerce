<template>
  <section class="mb-10 xl:mb-[70px]">
    <div class="container">
      <div class="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="text-xl font-semibold">Manufacturer coverage</h2>
          <p class="text-sm text-slate-500">Search a manufacturer to see its available catalog lines.</p>
        </div>
      </div>
      <div
        class="mb-2.5 grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-center md:justify-between md:gap-y-4 lg:px-[14px] xl:px-9 xl:mb-[15px]"
      >
        <NuxtLink
          v-for="logo in logos"
          :key="logo.name"
          :to="{ path: '/search', query: { keyword: logo.name } }"
          class="flex min-h-[64px] items-center justify-center rounded-md border border-slate-200 bg-white px-4 md:min-h-0 md:border-0 md:bg-transparent md:px-0"
          :aria-label="`Search ${logo.name} parts`"
        >
          <span class="text-center text-sm font-semibold text-slate-700 md:text-base">{{ logo.name }}</span>
        </NuxtLink>
      </div>
      <NuxtLink
        to="/search"
        class="relative flex ml-auto max-w-max text-xs text-slate-500 after:absolute after:-bottom-0.5 after:left-0 after:w-full after:h-0.5 after:bg-neutral-700 after:origin-right after:scale-x-0 after:rounded-full after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100"
      >
        Search all manufacturers
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
const logos = [{ name: 'STMicroelectronics' }, { name: 'Analog Devices' }, { name: 'Nexperia' }];
</script>
