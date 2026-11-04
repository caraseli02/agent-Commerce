<template>
  <header class="fixed z-50 top-0 left-0 w-full bg-header text-header-foreground transition-transform duration-200 ease-out">
    <div class="relative z-10 border-b border-border bg-sidebar py-1.5 md:py-2">
      <div class="container">
        <div class="flex items-center text-muted-foreground md:justify-between">
          <div class="mr-4 flex items-center gap-2 md:mr-0">
            <HeadphonesIcon class="h-4 w-4" />
            <div class="hidden text-xs leading-5 md:flex">Sales: +1 800 555 0199 (Mon-Fri 8:00AM - 4:00PM EST)</div>
          </div>
          <div class="mr-auto flex items-center gap-2 text-xs font-medium leading-5 text-foreground md:mr-0">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden="true" />
            Flat-rate shipping from {{ flatShippingFrom }}
          </div>
          <!-- Negative margin keeps a 44px hit area without growing the slim bar. -->
          <UiButton
            variant="link"
            class="-my-3 h-auto min-h-11 p-0"
            aria-label="Regional preferences"
            @click="showRegionalPreferencesModal = true"
          >
            <RonFlag class="mr-2 h-4 w-5 rounded-[2px]" />
            <span class="text-xs leading-5 text-muted-foreground">{{ regionalLabel }}</span>
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

// Matches the cheapest catalog shipping quote (Demo Express); the quote has no free tier.
const flatShippingFrom = computed(() => {
  const curr = currency.value?.label || 'Lei';
  return `19.90 ${curr}`;
});

const showRegionalPreferencesModal = ref(false);
</script>
