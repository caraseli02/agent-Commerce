<script setup lang="ts">
import { ref } from 'vue';
import { PencilLine } from 'lucide-vue-next';
import { useCategories } from '@/composables/useCategories';
import type { ICreatePayload, TaxonomyInterface } from '~/types/dashboard/categories';
import type { IconName } from '@/types/Icons';
import { toast } from '~/components/ui/toast';

const props = defineProps<{ category: TaxonomyInterface }>();
const enableSmartPricing = ref(false);
const enableCustomProperties = ref(false);

const title = ref('');
const icon = ref<IconName>('PlugIcon');
const selectedEntryPrice = ref('');
const selectedQuantity = ref('');
const selectedMargin = ref('');

const avgWeight = ref('');
const width = ref('');
const height = ref('');
const length = ref('');

onMounted(() => {
  title.value = props.category.name;
  icon.value = (props.category.icon ?? 'PlugIcon') as IconName;

  selectedEntryPrice.value = props.category.smartPricingSettings?.priceRangeId ?? '';
  selectedQuantity.value = props.category.smartPricingSettings?.quantityId ?? '';
  selectedMargin.value = props.category.smartPricingSettings?.marginId ?? '';
  enableSmartPricing.value = selectedEntryPrice.value !== '' && selectedQuantity.value !== '' && selectedMargin.value !== '';

  avgWeight.value = props.category.customProperties?.avgItemWeight?.toString() ?? '';
  length.value = props.category.customProperties?.length?.toString() ?? '';
  width.value = props.category.customProperties?.width?.toString() ?? '';
  height.value = props.category.customProperties?.height?.toString() ?? '';
  enableCustomProperties.value = avgWeight.value !== '' && length.value !== '' && width.value !== '' && height.value !== '';
});

const { updateCategory, selectedCategories, isLocked } = useCategories();

const isOpen = ref(false);

async function makeUpdate() {
  const payload: ICreatePayload = {
    name: title.value,
    icon: icon.value,
    enableSmartPricing: enableSmartPricing.value,
    enableCustomProperties: enableCustomProperties.value,
  };

  if (enableSmartPricing.value) {
    payload.smartPricingSettings = {
      priceRangeId: selectedEntryPrice.value,
      quantityId: selectedQuantity.value,
      marginId: selectedMargin.value,
    };
  }

  if (enableCustomProperties.value) {
    payload.customProperties = {
      avgItemWeight: Number(avgWeight.value),
      length: Number(length.value),
      width: Number(width.value),
      height: Number(height.value),
    };
  }

  if (selectedCategories.value[0]) {
    payload.parentId = selectedCategories.value[0];
  }
  const response = await updateCategory(props.category.id, payload);

  if (response?.status === 'success') {
    title.value = '';
    isOpen.value = false;

    toast({
      title: 'Category updated',
      description: response.description,
      variant: 'success',
    });
    return;
  }

  toast({
    title: 'Category update failed',
    description: 'Something went wrong. Please try again.',
    variant: 'destructive',
  });
}

const updateSmartPricingEnabled = (value: boolean) => {
  enableSmartPricing.value = value;
};

const updateCustomPropertiesEnabled = (value: boolean) => {
  enableCustomProperties.value = value;
};
</script>

<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogTrigger as-child>
      <UiButton variant="ghost" size="icon" :disabled="selectedCategories.length > 1 || isLocked">
        <PencilLine class="w-5 h-5 text-slate-500" />
      </UiButton>
    </UiDialogTrigger>
    <UiDialogContent class="sm:max-w-[640px]">
      <UiDialogHeader>
        <UiDialogTitle>Edit Category</UiDialogTitle>
      </UiDialogHeader>
      <div class="grid gap-4 py-4">
        <div class="flex flex-col items-start gap-4">
          <UiLabel for="title" class="text-right"> Title </UiLabel>
          <UiInput id="title" v-model="title" class="col-span-3" />
        </div>
        <div class="flex flex-col items-start gap-4">
          <UiLabel for="title" class="text-right">
            ID: <b>{{ category.id }}</b>
          </UiLabel>
        </div>
        <div class="flex flex-col items-start gap-4">
          <IconUpload @update:svg-preview="icon = $event as IconName" />
        </div>
        <CategoriesSmartPricing
          :entry-price="selectedEntryPrice"
          :quantity="selectedQuantity"
          :margin="selectedMargin"
          :enabled="enableSmartPricing"
          @update:enabled="updateSmartPricingEnabled"
          @update:entry-price="selectedEntryPrice = $event"
          @update:quantity="selectedQuantity = $event"
          @update:margin="selectedMargin = $event"
        />
        <CategoriesCustomProperties
          :avg-item-weight="avgWeight"
          :length="length"
          :width="width"
          :height="height"
          :enabled="enableCustomProperties"
          @update:enabled="updateCustomPropertiesEnabled"
          @update:weight="avgWeight = $event"
          @update:length="length = $event"
          @update:width="width = $event"
          @update:height="height = $event"
        />
      </div>
      <UiDialogFooter>
        <UiButton variant="secondary" @click="isOpen = false"> Cancel </UiButton>
        <UiButton :disabled="isLocked" @click="makeUpdate()"> Update </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
