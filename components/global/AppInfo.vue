<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogContent>
      <div class="text-center max-w-md mx-auto my-8">
        <h4 class="text-2xl font-semibold text-gray-800">This platform is currently in beta testing. Please proceed with caution.</h4>
        <p class="mt-2 text-sm text-gray-600">
          For support, reach out to
          <a href="mailto:support@demo.app" class="text-blue-500 underline hover:text-blue-700"> support@demo.app </a>
        </p>
        <span class="mt-4 text-gray-700 block">Thank you!</span>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>();
</script>

<style scoped></style>
