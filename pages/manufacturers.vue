<template>
  <div class="container py-8 md:py-10 xl:py-12">
    <nav aria-label="Breadcrumb" class="mb-6 text-xs text-slate-500">
      <ol class="flex flex-wrap items-center gap-1.5">
        <li>
          <NuxtLink to="/" class="transition-colors hover:text-slate-700">Home</NuxtLink>
        </li>
        <li aria-hidden="true">/</li>
        <li class="font-medium text-slate-700" aria-current="page">Manufacturers</li>
      </ol>
    </nav>

    <header class="mb-8 max-w-3xl">
      <h1 class="text-2xl font-semibold text-slate-900 md:text-3xl">Manufacturers</h1>
      <p class="mt-3 text-sm leading-relaxed text-slate-500 md:text-base">
        ECAS stocks components from leading global brands. Browse authorized lines across semiconductors, passives, connectors, and
        industrial automation.
      </p>
    </header>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <article
        v-for="manufacturer in demoManufacturers"
        :key="manufacturer.name"
        class="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-xs transition-shadow hover:shadow-sm"
      >
        <div class="mb-4 flex min-h-[72px] w-full items-center justify-center px-4">
          <img :src="manufacturer.logo" :alt="`${manufacturer.name} logo`" class="max-h-12 max-w-full object-contain" loading="lazy" />
        </div>
        <h2 class="text-base font-semibold text-slate-900">{{ manufacturer.name }}</h2>
        <p class="mt-1 text-xs text-slate-500">{{ manufacturer.category }}</p>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { demoManufacturers } from './manufacturers-data';

useHead({
  title: 'Manufacturers',
  meta: [
    {
      name: 'description',
      content: 'Browse top electronic component manufacturers available through the ECAS portfolio demo.',
    },
  ],
});
</script>
