<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
});

// Since /checkout is often used as a parent but needs an entry point,
// we redirect to the first actual checkout step (e.g., payment or summary)
await navigateTo('/checkout/payment');
</script>

<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="flex flex-col items-center gap-4">
      <SkeletonLoader class="w-12 h-12 rounded-full" />
      <p class="text-zinc-500 animate-pulse font-medium">Entering checkout...</p>
    </div>
  </div>
</template>
