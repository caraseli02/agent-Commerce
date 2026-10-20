<template>
  <div class="flex flex-col gap-4 text-sm text-foreground">
    <p>
      Orders from {{ tier.min.toFixed(2) }} Lei to below {{ tier.max.toFixed(2) }} Lei excluding VAT have a {{ tier.price.toFixed(2) }} Lei
      handling charge.
    </p>
    <p>Delivery is charged separately. The Payment Summary includes this handling charge in your total.</p>
  </div>
</template>

<script setup lang="ts">
import type { SmallOrderChargeTier } from '~~/helpers/order-money';

defineProps<{ tier: SmallOrderChargeTier }>();
</script>
