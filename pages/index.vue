<template>
  <div>
    <HomeHero />
    <HomeFeaturedProducts />
    <div class="container mb-10 lg:mb-14 xl:mb-16">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-stretch">
        <LazyQuickBuy />
        <LazyEcxlusiveOffer />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Home',
  description:
    'Source electronic components with confidence. Compare specifications, check real-time stock across trusted manufacturers, and order the parts your build needs.',
  ogTitle: 'Components Marketplace — Electronic Components Sourced Reliably',
  ogDescription:
    'Source electronic components with confidence. Compare specifications, check real-time stock across trusted manufacturers, and order the parts your build needs.',
});
</script>
