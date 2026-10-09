<script setup lang="ts">
import { CopyIcon, FileCheck, FileMinus, Trash2Icon } from '@lucide/vue';
import type { TaxonomyInterface } from '~~/types/dashboard/categories';

defineProps<{
  category: TaxonomyInterface;
  parentId?: string;
}>();

const { toggleCategoryStatus, deleteCategories, duplicateCategory, isLocked } = useCategories();

const isOpen = ref(false);

const toggleAndClose = (id: string) => {
  isOpen.value = !isOpen.value;
  toggleCategoryStatus(id);
};
</script>

<template>
  <div class="flex items-center gap-1 self-stretch px-3 my-auto">
    <LazyCategoriesMergeDialog :category-ids="[category.id]" />
    <LazyCategoriesUpdateCategory :category="category" />
  </div>
  <UiPopover v-model:open="isOpen">
    <UiPopoverTrigger as-child>
      <UiButton variant="secondary" class="bg-dark-50" size="icon">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-ellipsis-vertical"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </UiButton>
    </UiPopoverTrigger>
    <UiPopoverContent side="left" :collision-padding="10" class="flex gap-1 flex-col items-start p-2 w-40">
      <UiButton
        :disabled="isLocked"
        class="gap-1 w-full justify-start"
        size="sm"
        variant="ghost"
        @click="duplicateCategory(category.id, parentId)"
      >
        <CopyIcon class="w-4 h-4" />
        Duplicate
      </UiButton>
      <CategoriesMoveDialog :category-ids="[category.id]" />
      <UiButton :disabled="isLocked" class="gap-1 w-full justify-start" size="sm" variant="ghost" @click="toggleAndClose(category.id)">
        <template v-if="category.isPublished">
          <FileMinus class="w-4 h-4" />
          Unpublish
        </template>
        <template v-else>
          <FileCheck class="w-4 h-4" />
          Publish
        </template>
      </UiButton>
      <UiAlertDialog>
        <UiAlertDialogTrigger as-child>
          <UiButton :disabled="isLocked" class="gap-1 w-full justify-start" size="sm" variant="ghost">
            <Trash2Icon class="w-4 h-4" />
            Delete
          </UiButton>
        </UiAlertDialogTrigger>
        <UiAlertDialogContent>
          <UiAlertDialogHeader>
            <UiAlertDialogTitle>Are you absolutely sure?</UiAlertDialogTitle>
            <UiAlertDialogDescription>
              This action cannot be undone. This will permanently delete and remove category from our servers.
            </UiAlertDialogDescription>
          </UiAlertDialogHeader>
          <UiAlertDialogFooter>
            <UiAlertDialogCancel>Cancel</UiAlertDialogCancel>
            <UiAlertDialogAction @click="deleteCategories([category.id])"> Continue </UiAlertDialogAction>
          </UiAlertDialogFooter>
        </UiAlertDialogContent>
      </UiAlertDialog>
    </UiPopoverContent>
  </UiPopover>
</template>

<style scoped></style>
