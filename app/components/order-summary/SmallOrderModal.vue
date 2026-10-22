<template>
  <div class="flex flex-col gap-4 text-sm text-foreground">
    <p>
      Orders from {{ formatLei(tier.min) }} to below {{ formatLei(tier.max) }} excluding VAT have a {{ formatLei(tier.price) }}
      handling charge.
    </p>
    <p>Delivery is charged separately. The Payment Summary includes this handling charge in your total.</p>
  </div>
</template>

<script setup lang="ts">
import type { SmallOrderChargeTier } from '~~/helpers/order-money';
import { formatLei } from '~~/helpers/money-format';

defineProps<{ tier: SmallOrderChargeTier }>();
</script>
