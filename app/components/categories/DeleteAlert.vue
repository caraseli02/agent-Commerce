<script setup lang="ts">
const { showDeleteAlert } = useCategories();
</script>

<template>
  <UiAlertDialog v-model:open="showDeleteAlert">
    <UiAlertDialogContent>
      <UiAlertDialogHeader>
        <UiAlertDialogTitle>Delete category</UiAlertDialogTitle>
        <UiAlertDialogDescription> Are you sure you want to delete this category? This action cannot be undone. </UiAlertDialogDescription>
      </UiAlertDialogHeader>
      <UiAlertDialogFooter>
        <UiAlertDialogCancel>Cancel</UiAlertDialogCancel>
        <UiAlertDialogAction>Delete</UiAlertDialogAction>
      </UiAlertDialogFooter>
    </UiAlertDialogContent>
  </UiAlertDialog>
</template>
