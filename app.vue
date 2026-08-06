<template>
  <UiTooltipProvider>
    <NuxtLayout>
      <NuxtPage id="nuxt_page" class="relative" />
    </NuxtLayout>
  </UiTooltipProvider>
</template>

<script setup lang="ts">
useHead({
  htmlAttrs: {
    lang: 'en',
  },
});

// Site-wide SEO defaults. Individual pages override title/description via their own useSeoMeta call.
useSeoMeta({
  titleTemplate: (title?: string | null) => (title ? `${title} | ECAS` : 'ECAS — Electronic Components Sourced Reliably'),
  description:
    'Browse thousands of electronic components from trusted manufacturers. Check live stock, compare specifications, and order with confidence.',
  ogType: 'website',
  ogSiteName: 'ECAS',
  ogTitle: 'ECAS — Electronic Components Sourced Reliably',
  ogDescription:
    'Browse thousands of electronic components from trusted manufacturers. Check live stock, compare specifications, and order with confidence.',
  twitterCard: 'summary_large_image',
});
</script>
