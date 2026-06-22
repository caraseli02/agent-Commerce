<script setup lang="ts">
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const heroSlides = [0];
</script>

<template>
  <Carousel class="relative w-full h-96 lg:h-full bg-white rounded-xl border border-gray-200 border-solid shadow-s focus-visible:ring-0">
    <CarouselContent>
      <CarouselItem v-for="(_, index) in heroSlides" :key="index">
        <div class="p-0">
          <section
            class="relative flex h-full items-end overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-6 py-14 lg:px-10 lg:py-20"
            role="region"
            aria-labelledby="hero-title"
          >
            <div class="flex flex-col gap-5 text-zinc-800 max-w-[460px]">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">ECAS procurement demo</p>
              <h4 id="hero-title" class="text-2xl font-bold leading-tight lg:text-5xl">Source electronic components with confidence</h4>
              <p class="text-sm leading-6 text-slate-600 lg:text-base">
                Review stock, compare part details, and move from product discovery to checkout in a clearer B2B buying flow.
              </p>
              <NuxtLink to="/search" class="w-fit max-w-full">
                <UiButton class="w-fit max-w-full whitespace-normal break-words text-left h-auto leading-5 py-2 px-4">
                  Explore Products
                </UiButton>
              </NuxtLink>
            </div>
          </section>
        </div>
      </CarouselItem>
    </CarouselContent>
    <CarouselPrevious v-if="heroSlides.length > 1" class="left-auto right-16 top-auto bottom-4 translate-y-0" />
    <CarouselNext v-if="heroSlides.length > 1" class="right-4 top-auto bottom-4 translate-y-0" />
  </Carousel>
</template>
