<template>
  <UiTooltipProvider>
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:outline-2 focus:outline-ring"
      >Skip to content</a
    >
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
  titleTemplate: (title?: string | null) => (title ? `${title} | Components Marketplace` : 'Components Marketplace: Electronic Components'),
});

// Private routes get noindex,nofollow here; public storefront pages own their
// description, Open Graph and Twitter tags through usePageSeo.
usePrivateRouteSeo();
</script>
