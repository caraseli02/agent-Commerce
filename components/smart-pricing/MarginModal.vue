<script setup lang="ts">
import { PlusIcon, Trash2Icon } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { useNuxtApp } from '#app';
import { usePricingStore } from '~/store/pricingStore';
import { PriceSettingsTypeEnum } from '~/model/prices/price-settings.interface';

interface MarginFormItem {
  id: number;
  value: string;
}

const pricingStore = usePricingStore();
const { showMarginModal, editMarginModal } = storeToRefs(pricingStore);

const { $api } = useNuxtApp();

const marginList = ref<MarginFormItem[]>([{ id: 1, value: '' }]);

watch(
  () => pricingStore.showMarginModal,
  (newValue) => {
    if (newValue) {
      if (editMarginModal.value) {
        pricingStore.type = 'edit';
        if (editMarginModal.value.value) {
          marginList.value = editMarginModal.value.value.map((value: string, index: number) => ({
            id: index + 1,
            value: `${Number(value.replace('%', ''))}`,
          }));
        }
      }
      else {
        pricingStore.type = 'add';
        marginList.value = [{ id: 1, value: '' }];
      }
    }
  },
  { deep: true },
);

function addMargin() {
  marginList.value.push({ id: marginList.value.length + 1, value: '' });
}

function removeMargin(id: number) {
  marginList.value = marginList.value.filter(q => q.id !== id);
}

const createNewMarginTemplate = async () => {
  if (marginList.value.find(item => Number(item.value) === 0 || Number(item.value) < 0)) {
    return;
  }
  if (pricingStore.type === 'edit' && editMarginModal.value) {
    const editedMarginObject = {
      label: editMarginModal.value.label,
      type: PriceSettingsTypeEnum.Margins,
      values: marginList.value.map(item => Number(item.value)),
    };

    const response = await $api.smartPricing.editPriceRange(editedMarginObject, editMarginModal.value._id);
    if (response.status !== 'success') {
      return;
    }
    await pricingStore.updateAndReturnPricing();
  }
  else if (pricingStore.type === 'add') {
    const response = await $api.smartPricing.setNewMarginRange({
      values: marginList.value.map(item => Number(item.value)),
      label: `NM-${pricingStore.margin.length}`,
    });
    if (response.status !== 'success') {
      return;
    }
    await pricingStore.updateAndReturnPricing();
  }
};
</script>

<template>
  <UiDialog v-model:open="showMarginModal">
    <UiDialogContent class="max-w-sm p-4 sm:max-w-[480px] gap-10 border-none rounded-xl shadow-s">
      <UiDialogHeader>
        <UiDialogTitle>Create Margin Template</UiDialogTitle>
      </UiDialogHeader>
      <div class="flex flex-col gap-4">
        <section
          v-for="item in marginList"
          :key="item.id"
          class="flex gap-4"
        >
          <div
            class="flex overflow-hidden flex-1 shrink gap-2 items-center pr-3 min-h-12 bg-white rounded-lg border border-solid basis-0 border-grey-300"
          >
            <span
              class="overflow-hidden self-stretch px-3 py-2 my-auto min-w-11 h-11 text-xl leading-snug text-center border-r border-solid bg-stone-50 border-r-grey-300 text-zinc-800"
            >
              %
            </span>
            <label
              for="minPrice"
              class="sr-only"
            >Margin Value</label>
            <input
              id="minPrice"
              v-model="item.value"
              type="number"
              class="self-stretch my-auto text-sm leading-none text-neutral-400 w-full bg-transparent border-none focus:outline-none"
              placeholder="i.e 100"
              aria-label="Margin Value"
            >
          </div>
          <UiButton
            type="button"
            class="min-w-10 h-12 p-0"
            variant="secondary"
            @click="removeMargin(item.id)"
          >
            <Trash2Icon class="w-6 h-6" />
          </UiButton>
        </section>
      </div>
      <UiDialogFooter class="sm:justify-start">
        <UiButton
          type="button"
          class="min-w-10 h-10 p-0"
          variant="secondary"
          @click="addMargin()"
        >
          <PlusIcon class="w-6 h-6" />
        </UiButton>
        <UiButton
          class="w-full"
          type="button"
          @click="
            createNewMarginTemplate();
            showMarginModal = false;
          "
        >
          Create
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
