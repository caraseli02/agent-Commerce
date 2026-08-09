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
  titleTemplate: (title?: string | null) =>
    title ? `${title} | Components Marketplace` : 'Components Marketplace — Electronic Components',
  description:
    'Browse thousands of electronic components from trusted manufacturers. Check live stock, compare specifications, and order with confidence.',
  ogType: 'website',
  ogSiteName: 'Components Marketplace',
  ogTitle: 'Components Marketplace — Electronic Components',
  ogDescription:
    'Browse thousands of electronic components from trusted manufacturers. Check live stock, compare specifications, and order with confidence.',
  // Use summary until a site-wide ogImage exists; routes with ogImage can opt into large cards.
  twitterCard: 'summary',
});
</script>
