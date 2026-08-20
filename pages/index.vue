<template>
  <div>
    <HomeHero />
    <HomeFeaturedProducts />
    <LazyBanner />
    <div class="container mb-[30px] lg:mb-10 xl:mb-[60px]">
      <div class="grid grid-cols-1 gap-[15px] md:grid-cols-[40%_calc(60%-20px)] md:gap-5 xl:grid-cols-[41%_calc(59%-20px)]">
        <LazyQuickBuy />
        <LazyEcxlusiveOffer />
      </div>
    </div>
    <LazyNewProducts />
    <LazyNews />
    <LazyManufacturers />
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
