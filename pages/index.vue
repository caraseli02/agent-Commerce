<template>
  <div>
    <HomeHero />
    <HomeFeaturedProducts />
    <LazyBanner />
    <div class="container mb-[30px] lg:mb-10 xl:mb-[60px]">
      <div class="grid grid-cols-1 gap-[15px] md:grid-cols-[40%,calc(60%-20px)] md:gap-5 xl:grid-cols-[41%,calc(59%-20px)]">
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
useHead({
  title: 'Home',
});
</script>
