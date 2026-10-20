<template>
  <section class="mb-10 xl:mb-[70px]">
    <div class="container">
      <div class="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="text-xl font-semibold">Manufacturer coverage</h2>
          <p class="text-sm text-muted-foreground">Search a manufacturer to see its available catalog lines.</p>
        </div>
      </div>
      <div
        class="mb-2.5 grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-center md:justify-between md:gap-y-4 lg:px-[14px] xl:px-9 xl:mb-[15px]"
      >
        <NuxtLink
          v-for="logo in logos"
          :key="logo.name"
          :to="{ path: '/search', query: { keyword: logo.name } }"
          class="flex min-h-[64px] items-center justify-center rounded-md border border-border bg-card px-4 md:min-h-0 md:border-0 md:bg-transparent md:px-0 dark:md:bg-white dark:md:rounded-md dark:md:px-3 dark:md:py-2"
          :aria-label="`Search ${logo.name} parts`"
        >
          <ImageWithFallback
            :src="logo.image"
            :alt="`${logo.name} logo`"
            class-name="max-h-8 max-w-full object-contain md:h-[30px] md:max-h-none lg:h-10 xl:h-[55px]"
          />
        </NuxtLink>
      </div>
      <NuxtLink
        to="/search"
        class="relative flex ml-auto max-w-max text-xs text-muted-foreground after:absolute after:-bottom-0.5 after:left-0 after:w-full after:h-0.5 after:bg-neutral-700 after:origin-right after:scale-x-0 after:rounded-full after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100"
      >
        Search all manufacturers
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import ImageWithFallback from '~/components/global/ImageWithFallback.vue';
import MicrochipLogo from '@/assets/media/home/microchip.png';
import TDKLogo from '@/assets/media/home/tdk.png';
import DigiKeyLogo from '@/assets/media/home/digi-key.png';
import QuectelLogo from '@/assets/media/home/quectel.png';
import MaximIntegratedLogo from '@/assets/media/home/maxim-integrated.png';
import TrestonLogo from '@/assets/media/home/treston.png';
import TexasInstrumentsLogo from '@/assets/media/home/texas-instruments.png';

const logos = [
  { name: 'Microchip', image: MicrochipLogo },
  { name: 'TDK', image: TDKLogo },
  { name: 'Digi-Key', image: DigiKeyLogo },
  { name: 'Quectel', image: QuectelLogo },
  { name: 'Maxim Integrated', image: MaximIntegratedLogo },
  { name: 'Treston', image: TrestonLogo },
  { name: 'Texas Instruments', image: TexasInstrumentsLogo },
];
</script>
