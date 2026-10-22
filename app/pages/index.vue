<template>
  <div>
    <HomeHero />
    <HomeFeaturedProducts />
    <div class="container mb-16 mt-12 md:mb-20 md:mt-16">
      <div class="grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-stretch">
        <LazyQuickBuy :hydrate-on-visible="{ rootMargin: '200px' }" />
        <LazyEcxlusiveOffer :hydrate-on-visible="{ rootMargin: '200px' }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
usePageSeo({
  title: 'Electronic Components Sourced Reliably',
  description:
    'Source electronic components with confidence. Compare specifications, check real-time stock across trusted manufacturers, and order the parts your build needs.',
});
</script>
