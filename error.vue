<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900 px-4 text-center">
    <h1 class="text-6xl font-bold mb-4">
      {{ error.statusCode }}
    </h1>
    <h2 class="text-2xl font-semibold mb-6">
      {{ heading }}
    </h2>
    <p class="text-gray-600 mb-8 max-w-md">
      {{ displayMessage }}
    </p>
    <button class="px-6 py-3 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition-colors" @click="handleError">
      Go back home
    </button>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps({
  error: {
    type: Object as () => NuxtError,
    required: true,
  },
});

const isProductNotFound = computed(() => props.error.statusCode === 404 && props.error.statusMessage === 'Product not found');

const pageTitle = computed(() => {
  if (isProductNotFound.value) {
    return 'Product Not Found';
  }

  if (props.error.statusCode === 404) {
    return 'Page Not Found';
  }

  return 'Error';
});

const heading = computed(() => {
  if (isProductNotFound.value) {
    return 'Product not found';
  }

  if (props.error.statusCode === 404) {
    return 'Page Not Found';
  }

  return 'An error occurred';
});

const displayMessage = computed(() => {
  if (isProductNotFound.value) {
    return 'The product you are looking for does not exist or may have been removed.';
  }

  if (props.error.statusCode === 404) {
    return "We can't seem to find the page you're looking for.";
  }

  const message = props.error.message || '';

  if (/\[(?:GET|POST|PUT|PATCH|DELETE)\]|\/api\//i.test(message)) {
    return 'Something went wrong. Please try again later.';
  }

  return message || 'An unexpected error occurred.';
});

useHead({
  title: pageTitle,
});

const handleError = () => clearError({ redirect: '/' });
</script>
