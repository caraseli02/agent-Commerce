<template>
  <div v-if="article" class="container py-8 md:py-10 xl:py-12">
    <nav aria-label="Breadcrumb" class="mb-6 text-xs text-slate-500">
      <ol class="flex flex-wrap items-center gap-1.5">
        <li>
          <NuxtLink to="/" class="transition-colors hover:text-slate-700">Home</NuxtLink>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <NuxtLink to="/news" class="transition-colors hover:text-slate-700">News</NuxtLink>
        </li>
        <li aria-hidden="true">/</li>
        <li class="font-medium text-slate-700 line-clamp-1" aria-current="page">{{ article.title }}</li>
      </ol>
    </nav>

    <article class="mx-auto max-w-3xl">
      <time class="text-xs uppercase tracking-wide text-slate-400">{{ article.date }}</time>
      <h1 class="mt-2 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">{{ article.title }}</h1>
      <img :src="article.cover" :alt="article.title" class="mt-6 aspect-[1.76] w-full rounded-xl object-cover" loading="lazy" />
      <p class="mt-6 text-base leading-relaxed text-slate-600">{{ article.body }}</p>
      <NuxtLink to="/news" class="mt-8 inline-flex text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline">
        Back to all news
      </NuxtLink>
    </article>
  </div>
</template>

<script setup lang="ts">
import { findDemoNewsArticle } from './news-data';

const route = useRoute();
const slug = computed(() => {
  const value = route.params.slug;
  return Array.isArray(value) ? value[0] : value;
});

const article = computed(() => findDemoNewsArticle(slug.value));

if (!article.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'News article not found',
  });
}

useHead({
  title: article.value.title,
  meta: [
    {
      name: 'description',
      content: article.value.excerpt,
    },
  ],
});
</script>
