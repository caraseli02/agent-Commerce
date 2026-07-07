<template>
  <div class="flex items-center justify-center min-h-screen">
    <p>Redirecting to home...</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: [
    function (to) {
      const redirect = to.query.redirect?.toString();
      const query = redirect ? { signin: 'true', redirect } : { signin: 'true' };
      return navigateTo({ path: '/', query });
    },
  ],
});
</script>
