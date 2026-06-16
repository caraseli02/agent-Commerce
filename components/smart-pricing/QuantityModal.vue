<script setup lang="ts">
import { PlusIcon } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { usePricingStore } from '~/store/pricingStore';
import { useNuxtApp } from '#app';
import { PriceSettingsTypeEnum } from '~/model/prices/price-settings.interface';

const { $api } = useNuxtApp();

const pricingStore = usePricingStore();
const { showQuantityModal, editQuantityModal, type } = storeToRefs(pricingStore);

const quantityList = ref([{ id: 1, min: 0, max: 0 }]);
watch(
  () => pricingStore.showQuantityModal,
  (newValue) => {
    if (newValue) {
      if (editQuantityModal.value) {
        if (editQuantityModal.value.value) {
          pricingStore.type = 'edit';
          quantityList.value = editQuantityModal.value.value?.map((value: string, index: number) => ({
            id: index + 1,
            min: Number(value.split(' - ')[0] || 0),
            max: Number(value.split(' - ')[1] || 0),
          }));
        }
      }
      else {
        pricingStore.type = 'add';
        quantityList.value = [{ id: 1, min: 0, max: 0 }];
      }
    }
  },
  { deep: true },
);

function addQuantity() {
  quantityList.value.push({ id: quantityList.value.length + 1, min: 0, max: 0 });
}

function removeQuantity(id: number) {
  quantityList.value = quantityList.value.filter(q => q.id !== id);
}

function updateQuantity(id: number, quantity: { min: number; max: number }) {
  const index = quantityList.value.findIndex(q => q.id === id);
  if (index !== -1) {
    quantityList.value[index] = { ...quantityList.value[index], ...quantity };
  }
}

const createNewQuantityTemplate = async () => {
  if (
    quantityList.value.find(
      item => Number(item.min) >= Number(item.max) || Number(item.min) < 0 || Number(item.max) < 0 || Number(item.max) === 0,
    )
  ) {
    // Add your logic here to handle the creation without the price range values
    return;
  }
  if (type.value === 'edit' && editQuantityModal.value) {
    const editedQuantityObject = {
      label: editQuantityModal.value.label,
      type: PriceSettingsTypeEnum.Quantity,
      values: quantityList.value.map(item => Number(item.max)),
    };

    const response = await $api.smartPricing.editPriceRange(editedQuantityObject, editQuantityModal.value._id ?? '');
    if (response.status !== 'success') {
      // Add your logic here to handle the creation error
      return;
    }
    await pricingStore.updateAndReturnPricing();
  }
  else if (type.value === 'add') {
    const maxValues = quantityList.value.map(item => item.max);

    const response = await $api.smartPricing.setNewQuantityRange({
      values: maxValues,
      label: `QTY-${pricingStore.quantity?.length + 1}`,
    });
    if (response.status !== 'success') {
      // Add your logic here to handle the creation error
      return;
    }
    await pricingStore.updateAndReturnPricing();
  }

  // Add your logic here to handle the creation
};
</script>

<template>
  <UiDialog v-model:open="showQuantityModal">
    <UiDialogContent class="max-w-sm p-4 sm:max-w-[480px] gap-10 border-none rounded-xl shadow-s">
      <UiDialogHeader>
        <UiDialogTitle>Create Quantity Template</UiDialogTitle>
      </UiDialogHeader>
      <section class="flex flex-col gap-4">
        <SmartPricingQuantityRange
          v-for="quantity in quantityList"
          :key="quantity.id"
          :quantity="quantity"
          @delete="removeQuantity(quantity.id)"
          @update:quantity-range="updateQuantity(quantity.id, $event)"
        />
      </section>
      <UiDialogFooter class="sm:justify-start">
        <UiButton
          type="button"
          class="min-w-10 h-10 p-0"
          variant="secondary"
          @click="addQuantity()"
        >
          <PlusIcon class="w-6 h-6" />
        </UiButton>
        <UiButton
          class="w-full"
          type="button"
          @click="
            createNewQuantityTemplate();
            showQuantityModal = false;
          "
        >
          Create
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
