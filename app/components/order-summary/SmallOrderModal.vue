<template>
  <div class="flex flex-col gap-4 text-sm text-neutral-700">
    <p>
      Orders from {{ formatRegionalPrice(tier.min, currency?.value) }} to below
      {{ formatRegionalPrice(tier.max, currency?.value) }} excluding VAT have a
      {{ formatRegionalPrice(tier.price, currency?.value) }} handling charge.
    </p>
    <p>Delivery is charged separately. The Payment Summary includes this handling charge in your total.</p>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import type { SmallOrderChargeTier } from '~~/helpers/order-money';
import { formatRegionalPrice } from '~~/helpers/prices.helper';
import { useRegionalPreferencesStore } from '~/store/regionalPreferencesStore';

defineProps<{ tier: SmallOrderChargeTier }>();
const { currency } = storeToRefs(useRegionalPreferencesStore());
</script>
