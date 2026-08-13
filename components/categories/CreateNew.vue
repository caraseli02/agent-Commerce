<script setup lang="ts">
import { ref } from 'vue';
import { useCategories } from '@/composables/useCategories';
import UiSelectContent from '~/components/ui/select/SelectContent.vue';
import type { ICreatePayload } from '~/types/dashboard/categories';

const title = ref('');
const icon = ref('');

const { createCategory, selectedCategories, categoriesOptions, isLocked } = useCategories();

const isOpen = ref(false);
const selected = ref<string>('');
const selectedEntryPrice = ref<string>('');
const selectedQuantity = ref<string>('');
const selectedMargin = ref<string>('');

const avgWeight = ref('');
const width = ref('');
const height = ref('');
const length = ref('');

async function makeCreate() {
  const enableSmartPricing = selectedEntryPrice.value !== '' && selectedQuantity.value !== '' && selectedMargin.value !== '';
  const enableCustomProperties = avgWeight.value !== '' && length.value !== '' && width.value !== '' && height.value !== '';

  const payload: ICreatePayload = {
    name: title.value,
    icon: icon.value,
  };
  if (selected.value) {
    payload.parentId = selected.value;
  }

  if (enableSmartPricing) {
    payload.smartPricingSettings = {
      priceRangeId: selectedEntryPrice.value,
      quantityId: selectedQuantity.value,
      marginId: selectedMargin.value,
    };
  }

  if (enableCustomProperties) {
    payload.customProperties = {
      avgItemWeight: Number(avgWeight.value),
      width: Number(width.value),
      height: Number(height.value),
      length: Number(length.value),
    };
  }

  const response = await createCategory(payload);
  if (response) {
    title.value = '';
    isOpen.value = false;
  }
}

watch(isOpen, () => {
  if (isOpen.value) {
    selected.value = categoriesOptions.value.find((c) => c.id === selectedCategories.value[0])?.id || '';
    title.value = '';
  }
});
</script>

<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogTrigger as-child>
      <UiButton :disabled="selectedCategories.length > 1 || isLocked"> + Create New </UiButton>
    </UiDialogTrigger>
    <UiDialogContent class="sm:max-w-[640px]">
      <UiDialogHeader>
        <UiDialogTitle>Create Category</UiDialogTitle>
      </UiDialogHeader>
      <div class="grid gap-4 py-4">
        <div class="flex flex-col items-start gap-4">
          <UiLabel for="title" class="text-right"> Title </UiLabel>
          <UiInput id="title" v-model="title" class="col-span-3" />
        </div>
        <div class="flex flex-col items-start gap-4">
          <UiLabel for="destination" class="text-right"> Destination Category </UiLabel>
          <UiSelect v-model="selected">
            <UiSelectTrigger>
              <UiSelectValue placeholder="Select a Category" />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectGroup>
                <UiSelectLabel>Category</UiSelectLabel>
                <UiSelectItem v-for="item in categoriesOptions" :key="item.id" :value="item.id">
                  {{ item.name }}
                </UiSelectItem>
              </UiSelectGroup>
            </UiSelectContent>
          </UiSelect>
        </div>
        <div class="flex flex-col items-start gap-4">
          <IconUpload @update:svg-preview="icon = $event" />
        </div>
        <CategoriesSmartPricing
          @update:entry-price="selectedEntryPrice = $event"
          @update:quantity="selectedQuantity = $event"
          @update:margin="selectedMargin = $event"
        />
        <CategoriesCustomProperties
          @update:weight="avgWeight = $event"
          @update:length="length = $event"
          @update:width="width = $event"
          @update:height="height = $event"
        />
      </div>
      <UiDialogFooter>
        <UiButton variant="secondary" @click="isOpen = false"> Cancel </UiButton>
        <UiButton :disabled="isLocked" @click="makeCreate()"> Create </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
