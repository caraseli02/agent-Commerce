<script setup lang="ts">
import { MergeIcon } from '@lucide/vue';
import UiSelectContent from '~/components/ui/select/SelectContent.vue';

const { categories, mergeCategories, isLocked } = useCategories();

const props = defineProps<{ categoryIds: string[] }>();

const isOpen = ref(false);
const selected = ref<string>('');

const handleMerge = async () => {
  await mergeCategories(props.categoryIds, selected.value);
  isOpen.value = false;
};

const options = computed(() => {
  if (categories.value && categories.value.length > 0) {
    return extractIdAndName(categories.value, props.categoryIds);
  }
  return [];
});
</script>

<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogTrigger>
      <UiButton :disabled="isLocked" variant="ghost">
        <MergeIcon class="w-5 h-5 text-slate-500 cursor-pointer" />
      </UiButton>
    </UiDialogTrigger>
    <UiDialogContent class="sm:max-w-[640px]">
      <UiDialogHeader>
        <UiDialogTitle>Merge Selected</UiDialogTitle>
      </UiDialogHeader>
      <div class="grid gap-4 py-4">
        <div class="flex flex-col items-start gap-4">
          <UiLabel for="destination" class="text-right"> Destination Category </UiLabel>
          <UiSelect v-model="selected">
            <UiSelectTrigger>
              <UiSelectValue placeholder="Select a Category" />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectGroup>
                <UiSelectLabel>Category</UiSelectLabel>
                <UiSelectItem v-for="item in options" :key="item.id" :value="item.id">
                  {{ item.name }}
                </UiSelectItem>
              </UiSelectGroup>
            </UiSelectContent>
          </UiSelect>
        </div>
      </div>
      <UiDialogFooter>
        <UiButton :disabled="isLocked" variant="secondary" type="submit" @click="isOpen = false"> Cancel </UiButton>
        <UiButton :disabled="isLocked" type="submit" @click="handleMerge"> Merge </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
