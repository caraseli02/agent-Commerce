<template>
  <section
    class="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-primary/[0.04] sm:flex-row sm:items-stretch"
  >
    <div class="relative z-10 flex flex-1 flex-col justify-center p-5 md:p-8 lg:p-6 xl:p-10">
      <h2
        class="max-w-md text-balance font-display text-xl font-semibold leading-tight tracking-[-0.015em] text-foreground md:text-2xl xl:text-[28px]"
      >
        Make a shortlist your team can trust.
      </h2>
      <p class="mt-3 max-w-[48ch] text-[15px] leading-6 text-muted-foreground">
        Compare stock, specifications, manufacturers, and volume pricing in the catalog before you send a purchase request for review.
      </p>
      <NuxtLink to="/search" :class="cn(buttonVariants({ variant: 'cart', size: 'lg' }), 'mt-6 w-fit gap-2 px-6')">
        Browse the catalog
        <ArrowRight class="h-4 w-4" aria-hidden="true" />
      </NuxtLink>
    </div>
    <!-- Sized wrapper: ImageWithFallback puts class-name on its root and its img, so the frame owns the size. -->
    <div
      class="flex h-40 shrink-0 items-end justify-center px-5 pb-4 sm:h-auto sm:w-[38%] sm:items-center sm:px-0 sm:pb-0 sm:pr-6 lg:w-[34%] xl:w-[40%]"
    >
      <ImageWithFallback :src="ItemImage" alt="Soldering station" class-name="h-full max-h-[200px] w-full object-contain" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ItemImage from '@/assets/media/home/exclusive-offer-item.png';
</script>
