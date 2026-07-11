<script setup lang="ts">
const route = useRoute();
</script>

<template>
  <OrderConfirmBuyerConfirmation :order-id="route.params.id" :is-new="route.query.new === 'true'" />
</template>
