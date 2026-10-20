<template>
  <section
    class="flex min-h-[220px] flex-col justify-center rounded-2xl bg-[#102544] px-5 py-8 text-white sm:px-8 md:px-10 md:py-10 xl:px-12"
  >
    <h2 class="max-w-xl text-2xl font-semibold leading-tight md:text-3xl">Make a shortlist your team can trust.</h2>
    <p class="mt-3 max-w-xl text-sm leading-6 text-slate-300 md:text-base">
      Compare stock, manufacturers, and volume pricing in the sample catalog before you send a purchase request for review.
    </p>
    <NuxtLink
      to="/search"
      class="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#102544]"
    >
      Browse the catalog <ArrowRight class="h-4 w-4" aria-hidden="true" />
    </NuxtLink>
  </section>
</template>

<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';
</script>
