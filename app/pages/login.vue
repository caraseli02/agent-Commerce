<template>
  <div class="flex items-center justify-center min-h-screen">
    <p>Redirecting to home...</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: [
    function (_to, _from) {
      return navigateTo('/');
    },
  ],
});
</script>
