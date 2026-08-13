<script setup lang="ts">
import { MoveIcon } from 'lucide-vue-next';
import UiSelectContent from '~/components/ui/select/SelectContent.vue';

const { categories, moveCategories, isLocked } = useCategories();

const props = defineProps<{ categoryIds: string[] }>();

const isOpen = ref(false);
const selected = ref<string>('');

const handleMove = async () => {
  await moveCategories(props.categoryIds, selected.value);
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
    <UiDialogTrigger class="w-full">
      <UiButton :disabled="isLocked" class="gap-1 w-full justify-start" size="sm" variant="ghost">
        <MoveIcon class="w-4 h-4" />
        Move
      </UiButton>
    </UiDialogTrigger>
    <UiDialogContent class="sm:max-w-[640px]">
      <UiDialogHeader>
        <UiDialogTitle>Move Selected</UiDialogTitle>
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
        <UiButton :disabled="isLocked" type="submit" @click="handleMove"> Move </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
