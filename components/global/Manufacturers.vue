<template>
  <section class="mb-10 xl:mb-[70px]">
    <div class="container">
      <h2 class="text-xl font-semibold mb-5">Top Manufacturers</h2>
      <div
        class="mb-2.5 grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-center md:justify-between md:gap-y-4 lg:px-[14px] xl:px-9 xl:mb-[15px]"
      >
        <div
          v-for="(logo, index) in logos"
          :key="index"
          class="flex min-h-[64px] items-center justify-center rounded-md border border-slate-200 bg-white px-4 md:min-h-0 md:border-0 md:bg-transparent md:px-0"
        >
          <ImageWithFallback
            :src="logo"
            alt="Manufacturer logo"
            class-name="max-h-8 max-w-full object-contain md:h-[30px] md:max-h-none lg:h-10 xl:h-[55px]"
          />
        </div>
      </div>
      <NuxtLink
        to="/"
        class="relative flex ml-auto max-w-max text-xs text-slate-500 after:absolute after:-bottom-0.5 after:left-0 after:w-full after:h-0.5 after:bg-neutral-700 after:origin-right after:scale-x-0 after:rounded-full after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100"
      >
        View all manufacturers
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

const logos = [MicrochipLogo, TDKLogo, DigiKeyLogo, QuectelLogo, MaximIntegratedLogo, TrestonLogo, TexasInstrumentsLogo];
</script>
