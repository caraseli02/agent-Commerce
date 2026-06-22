<script setup lang="ts">
import { storeToRefs } from 'pinia';
import PriceRange from './PriceRange.vue';
import { usePricingStore } from '~/store/pricingStore';
import { editPriceRange, setNewPriceRange } from '~/composables/api/smart-pricing';

const pricingStore = usePricingStore();
const { showEntryModal, editEntryPriceModal } = storeToRefs(pricingStore);

type PriceRangeType = {
  min: number | null;
  max: number | null;
  label: string | null;
};

const priceRange = ref<PriceRangeType>({ min: null, max: null, label: null });
// Handle the "Create" button click
const handleCreate = async () => {
  if (
    priceRange.value.min === null ||
    priceRange.value.max === null ||
    priceRange.value.min >= priceRange.value.max ||
    priceRange.value.min < 0 ||
    priceRange.value.max < 0
  ) {
    // Add your logic here to handle the creation without the price range values
    return;
  }

  if (pricingStore.type === 'edit' && editEntryPriceModal.value) {
    const editedEntryPriceObject = {
      ...editEntryPriceModal.value,
      range: { min: priceRange.value.min, max: priceRange.value.max },
    };
    const response = await editPriceRange(editedEntryPriceObject, editEntryPriceModal.value?._id ?? '');
    if (response.status !== 'success') {
      // Add your logic here to handle the creation error
      return;
    }
    await pricingStore.updateAndReturnPricing();
  } else if (pricingStore.type === 'add') {
    const response = await setNewPriceRange({
      min: priceRange.value.min,
      max: priceRange.value.max,
      label: priceRange.value.label || `EP-${pricingStore.range?.length + 1}`,
    });
    if (response.status !== 'success' || !response.data.id) {
      // Add your logic here to handle the creation error
      return;
    }
    await pricingStore.updateAndReturnPricing();
  }

  showEntryModal.value = false;
  // Add your logic here to handle the creation with the price range values
};
</script>

<template>
  <UiDialog v-model:open="showEntryModal">
    <UiDialogContent class="max-w-sm p-4 sm:max-w-[480px] gap-10 border-none rounded-xl shadow-s">
      <UiDialogHeader>
        <UiDialogTitle>Create Entry Price Template</UiDialogTitle>
      </UiDialogHeader>
      <div class="flex items-center space-x-2">
        <PriceRange @update:price-range="priceRange = $event" />
      </div>
      <UiDialogFooter class="gap-4 sm:justify-start">
        <UiDialogClose as-child>
          <UiButton type="button" variant="secondary"> Cancel </UiButton>
        </UiDialogClose>
        <UiButton class="w-full" type="button" @click="handleCreate()"> Create </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
