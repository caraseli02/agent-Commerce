<template>
  <PaymentSessionCardForm :key="String($route.query.id || '')" />
</template>

<script setup lang="ts">
useHead({ title: 'Card payment' });
</script>
