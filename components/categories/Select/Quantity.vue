<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { CaretSortIcon, CheckIcon } from '@radix-icons/vue';
import { storeToRefs } from 'pinia';
import { cn } from '@/lib/utils';
import { usePricingStore } from '~/store/pricingStore';
import type { SmartPricingOption } from '~/model/prices/price-settings.interface';

const emit = defineEmits<{
  (e: 'update:quantity', value: string): void;
  (e: 'update:selection-length', value: number): void;
}>();

const props = withDefaults(
  defineProps<{
    title: string;
    quantity?: string;
    filterLength?: number | null;
  }>(),
  {
    quantity: '',
    filterLength: null,
  },
);

const pricingStore = usePricingStore();
const { quantity: quantityOptions } = storeToRefs(pricingStore);

const open = ref(false);
const selectedId = ref<string | null>(null);

const selectedLabel = computed(() => {
  const selectedItem = quantityOptions.value.find((item: SmartPricingOption) => item._id === selectedId.value);
  return selectedItem ? selectedItem.label : `Select ${props.title}`;
});

const handleSelect = (framework: SmartPricingOption) => {
  selectedId.value = framework._id;
  emit('update:selection-length', framework.value.length);
  emit('update:quantity', framework._id);
  open.value = false;
};

watchEffect(() => {
  if (props.quantity) {
    const selectedItem = quantityOptions.value.find((item: SmartPricingOption) => item._id === props.quantity);
    if (selectedItem) selectedId.value = selectedItem._id;
  }
});
</script>

<template>
  <section class="flex flex-col gap-1 entry-price">
    <span class="text-grey-600 text-sm">{{ title }}</span>
    <UiPopover
      v-model:open="open"
      class="w-full"
    >
      <UiPopoverTrigger as-child>
        <UiButton
          variant="outline"
          role="combobox"
          :aria-expanded="open"
          class="w-full justify-between"
        >
          {{ selectedLabel }}
          <CaretSortIcon class="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </UiButton>
      </UiPopoverTrigger>
      <UiPopoverContent
        disabled-portal
        class="w-full p-0"
      >
        <UiCommand class="w-full">
          <UiCommandInput
            class="h-9"
            placeholder="Search quantity..."
          />
          <UiCommandEmpty>No options found.</UiCommandEmpty>
          <UiCommandList>
            <UiCommandGroup>
              <UiCommandItem
                v-for="framework in quantityOptions"
                :key="framework._id"
                :value="framework.value"
                class="flex justify-between items-center w-full"
                @select="() => handleSelect(framework)"
              >
                {{ framework.label }}
                <div class="flex items-center gap-1 p-0.5">
                  <div
                    v-for="val in framework.value"
                    :key="val"
                  >
                    <UiBadge
                      class="bg-light-300"
                      variant="secondary"
                    >
                      {{ val }}
                    </UiBadge>
                  </div>
                  <CheckIcon :class="cn('ml-auto h-4 w-4', selectedId === framework._id ? 'opacity-100' : 'opacity-0')" />
                </div>
              </UiCommandItem>
            </UiCommandGroup>
          </UiCommandList>
        </UiCommand>
      </UiPopoverContent>
    </UiPopover>
  </section>
</template>

<style scoped>
.entry-price > [data-radix-popper-content-wrapper] {
    width: 100% !important;
    padding: 0 24px;
}

.entry-price > [data-radix-popper-content-wrapper] > div {
    width: 100% !important;
}

.entry-price > [data-radix-popper-content-wrapper] {
    max-width: none !important;
}

.UiCommand {
    width: 100%;
    box-sizing: border-box;
}
</style>
