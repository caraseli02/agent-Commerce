<template>
  <div class="container py-8 md:py-10 xl:py-12">
    <nav aria-label="Breadcrumb" class="mb-6 text-xs text-slate-500">
      <ol class="flex flex-wrap items-center gap-1.5">
        <li>
          <NuxtLink to="/" class="transition-colors hover:text-slate-700">Home</NuxtLink>
        </li>
        <li aria-hidden="true">/</li>
        <li class="font-medium text-slate-700" aria-current="page">News</li>
      </ol>
    </nav>

    <header class="mb-8 max-w-3xl">
      <h1 class="text-2xl font-semibold text-slate-900 md:text-3xl">News</h1>
      <p class="mt-3 text-sm leading-relaxed text-slate-500 md:text-base">
        Product launches, allocation updates, and supply-chain highlights from the ECAS demo catalog.
      </p>
    </header>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <article v-for="article in demoNewsArticles" :key="article.slug" class="overflow-hidden rounded-xl bg-white shadow-xs">
        <NuxtLink :to="`/news/${article.slug}`" class="flex h-full flex-col">
          <img :src="article.cover" :alt="article.title" class="aspect-[1.76] w-full object-cover" loading="lazy" />
          <div class="flex flex-1 flex-col p-4 md:p-5">
            <h2 class="text-base font-semibold leading-snug text-slate-900 line-clamp-3">{{ article.title }}</h2>
            <p class="mt-2 flex-1 text-sm leading-relaxed text-slate-500 line-clamp-3">{{ article.excerpt }}</p>
            <time class="mt-4 text-xs text-slate-400">{{ article.date }}</time>
          </div>
        </NuxtLink>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { demoNewsArticles } from './news-data';

useHead({
  title: 'News',
  meta: [
    {
      name: 'description',
      content: 'Latest component industry news and supply updates in the ECAS portfolio demo.',
    },
  ],
});
</script>
