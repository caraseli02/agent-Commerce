<template>
  <header
    class="fixed z-50 top-0 left-0 w-full bg-background transition-transform duration-300 md:shadow-[0_1px_0_0_hsl(var(--border)),0_4px_12px_-4px_rgba(15,23,42,0.06)]"
  >
    <div class="relative z-10 border-b border-border bg-muted py-1.5 md:py-2">
      <div class="container">
        <div class="flex items-center text-slate-500 md:justify-between">
          <div class="mr-4 flex items-center gap-2 md:mr-0">
            <HeadphonesIcon class="h-5 w-5" />
            <div class="hidden text-xs leading-[1.67] md:flex lg:text-sm lg:leading-tight">
              Sales: +1 800 555 0199 (Mon-Fri 8:00AM - 4:00PM EST)
            </div>
          </div>
          <div class="mr-auto text-xs font-semibold leading-[1.67] text-primary md:mr-0 lg:text-sm lg:leading-[1.43]">
            <span class="uppercase">Free</span> shipping on orders over {{ freeShippingThreshold }}
          </div>
          <UiButton variant="link" class="h-auto p-0" aria-label="Regional preferences" @click="showRegionalPreferencesModal = true">
            <RonFlag class="mr-2.5 h-5 w-6" />
            <span class="text-sm leading-[1.43] text-slate-500">{{ regionalLabel }}</span>
          </UiButton>
        </div>
      </div>
    </div>
    <LayoutHeaderMainRow />
  </header>
  <LayoutRegionalPreferencesModal v-if="showRegionalPreferencesModal" @close="showRegionalPreferencesModal = false" />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import RonFlag from '@/assets/icons/flags/ron.svg';
import HeadphonesIcon from '@/assets/icons/headphones.svg';
import { useRegionalPreferencesStore } from '~/store/regionalPreferencesStore';

const regionalPreferencesStore = useRegionalPreferencesStore();
const { currency } = storeToRefs(regionalPreferencesStore);

const regionalLabel = computed(() => currency.value?.label || 'Lei');

const freeShippingThreshold = computed(() => {
  const curr = currency.value?.label || 'Lei';
  return `150 ${curr}`;
});

const showRegionalPreferencesModal = ref(false);
</script>
