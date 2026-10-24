<template>
  <div class="flex items-center justify-between mb-6">
    <div>
      <nav aria-label="Breadcrumb" class="flex flex-wrap gap-y-2 items-center mb-3 max-sm:hidden">
        <NuxtLink
          to="/dashboard"
          class="flex items-center flex-shrink-0 font-medium text-muted-foreground transition-colors duration-200 hover:text-primary"
        >
          <HomeIcon class="w-[18px] h-[18px] mr-2" />
          <span class="text-xs leading-[1.33]">Home</span>
        </NuxtLink>
        <span class="text-xs leading-[1.33] flex-shrink-0 mx-1">/</span>
        <NuxtLink
          :to="sectionTo"
          class="text-xs leading-[1.33] flex-shrink-0 font-medium transition-colors duration-200 hover:text-primary"
          :class="[customer ? 'text-muted-foreground' : 'text-primary']"
        >
          {{ section }}
        </NuxtLink>
        <template v-if="customer">
          <span class="text-xs leading-[1.33] flex-shrink-0 mx-1">/</span>
          <NuxtLink
            :to="`/dashboard/customers/${customer.replace(/ /g, '-')}`"
            class="text-xs leading-[1.33] font-medium flex-shrink-0 text-primary transition-colors duration-200 hover:text-primary"
            :class="[panelView ? 'text-muted-foreground' : 'text-primary']"
          >
            {{ customerName }}
          </NuxtLink>
        </template>
        <template v-if="panelView && customer">
          <span class="text-xs leading-[1.33] flex-shrink-0 mx-1">/</span>
          <NuxtLink
            :to="`/dashboard/customers/${customer}/control-panel/${accountType == 0 ? 'account' : 'organization'}`"
            class="text-xs leading-[1.33] font-medium text-muted-foreground flex-shrink-0 transition-colors duration-200 hover:text-primary"
          >
            Control Panel
          </NuxtLink>
          <span class="text-xs leading-[1.33] flex-shrink-0 mx-1">/</span>
          <div class="text-xs leading-[1.33] font-medium flex-shrink-0 text-primary capitalize">
            {{ panelView.replace(/-/g, ' ') }}
          </div>
        </template>
      </nav>
      <h1 class="text-xl leading-[1.4] text-foreground font-semibold">
        {{ title }}
      </h1>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import HomeIcon from '@/assets/icons/dashboard/home.svg';

defineProps({
  section: {
    type: String,
    required: false,
    default: 'Customers',
  },
  sectionTo: {
    type: String,
    required: false,
    default: '/dashboard/customers',
  },
  title: {
    type: String,
    required: true,
  },
  customer: {
    type: String,
    required: false,
    default: undefined,
  },
  panelView: {
    type: String,
    required: false,
    default: undefined,
  },
  accountType: {
    type: Number,
    required: false,
    default: 0,
  },
  customerName: {
    type: String,
    required: false,
    default: '',
  },
});
</script>
