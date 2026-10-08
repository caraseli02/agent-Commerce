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
  titleTemplate: (title?: string | null) =>
    title ? `${title} | Components Marketplace` : 'Components Marketplace — Electronic Components',
});

// Private routes get noindex,nofollow here; public storefront pages own their
// description, Open Graph and Twitter tags through usePageSeo.
usePrivateRouteSeo();
</script>
