<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 text-center">
    <h1 class="text-6xl font-bold mb-4">
      {{ error.statusCode }}
    </h1>
    <h2 class="text-2xl font-semibold mb-6">
      {{ error.statusCode === 404 ? 'Page Not Found' : 'An error occurred' }}
    </h2>
    <p class="text-muted-foreground mb-8 max-w-md">
      {{ error.message || "We can't seem to find the page you're looking for." }}
    </p>
    <button
      class="px-6 py-3 bg-foreground text-background font-medium rounded-md hover:bg-foreground/90 transition-colors"
      @click="handleError"
    >
      Go back home
    </button>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app';

defineProps({
  error: {
    type: Object as () => NuxtError,
    required: true,
  },
});

const handleError = () => clearError({ redirect: '/' });
</script>
