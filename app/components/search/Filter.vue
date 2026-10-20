<template>
  <div class="flex flex-col bg-card rounded-md shadow-m">
    <div class="flex items-start justify-between p-2.5">
      <div class="font-Inter">
        <div class="text-xs font-semibold leading-tight truncate w-[140px] mb-[5px]">
          {{ FeatureName }}
        </div>
        <div class="text-xs leading-tight">({{ totalProducts }})</div>
      </div>
      <UiButton
        variant="secondary"
        size="icon"
        class="w-[22px] h-[22px]"
        :aria-label="`Hide ${FeatureName} filter`"
        @click="$emit('close')"
      >
        <XIcon class="w-[14px] h-[14px]" />
      </UiButton>
    </div>
    <div class="px-2.5 mb-2.5">
      <div class="flex relative">
        <UiInput v-model="searchValue" type="search" placeholder="Type here" class="h-8 pr-10" @update:model-value="onInput" />
        <FiltersIcon class="pointer-events-none absolute top-1/2 -translate-y-1/2 right-2.5 w-5 h-5 text-muted-foreground" />
      </div>
    </div>
    <div class="flex-1 pr-[5px]">
      <div class="grid grid-cols-1 gap-2 flex-1 max-h-[115px] overflow-y-auto scrollbar-thin pb-[13px]">
        <div v-for="option in options" :key="option.rawFilter.FeatureValue" class="flex items-start justify-between px-2.5">
          <UiCheckbox :id="optionId(option)" :checked="option.checked" class="order-last mt-px" @update:checked="toggleOption(option)" />
          <UiLabel :for="optionId(option)" class="cursor-pointer">
            {{ `${useTrimText(option.value + option.unit)} (${option.rawFilter.count})` }}
          </UiLabel>
        </div>
      </div>
    </div>
    <UiButton variant="secondary" class="group justify-between" @click="handleAll">
      <span class="text-xs transition-colors duration-300 group-hover:text-blue-500">
        {{ selectedAll ? 'Unselect All' : 'Select All' }}
      </span>
      <div
        class="flex items-center justify-center w-[18px] h-[18px] rounded border transition-colors duration-300"
        :class="[selectedAll ? 'bg-blue-500 border-blue-500 group-hover:bg-card' : 'bg-card  border-border group-hover:border-border']"
      >
        <CheckIcon v-if="selectedAll" class="w-4 text-white transition-colors duration-300 group-hover:text-blue-500" />
      </div>
    </UiButton>
  </div>
</template>

<script setup lang="ts">
import Emitter from 'tiny-emitter/instance.js';
import FiltersIcon from '@/assets/icons/filters.svg';
import CheckIcon from '@/assets/icons/check.svg';
import XIcon from '@/assets/icons/x.svg';
import { useTrimText } from '@/composables/text';
import type { FilterOptions, ProductFilters, SearchFiltersCategories } from '~~/types/product';

defineEmits(['close', 'add-filter-option']);

const props = defineProps<{
  filter: ProductFilters | null;
}>();

watch(
  () => props.filter,
  () => {
    if (!props.filter) {
      return;
    }
    options.value = parseOptions();
  },
  { deep: true },
);

const searchValue = ref('');
// Ids follow the option, not its position: radix copies the label text into aria-label once per id.
// Every character outside [A-Za-z0-9] is escaped by code point, so distinct values (`A.B`, `A-B`) never share an id.
const optionIdPrefix = useId();
const encodeIdPart = (value: string) => value.replace(/[^A-Za-z0-9]/gu, (char) => `_${char.codePointAt(0)?.toString(16)}_`);
const optionId = (option: FilterOptions) => `${optionIdPrefix}-${encodeIdPart(option.rawFilter.FeatureValue)}`;

const filter = ref(props.filter);
const options = ref([] as FilterOptions[]);

const onInput = () => {
  if (searchValue.value.trim() === '') {
    options.value = parseOptions();
  } else {
    options.value = parseOptions().filter((option) => {
      return option.value.toLowerCase().includes(searchValue.value.toLowerCase());
    });
  }
};

const parseOptions = (): FilterOptions[] => {
  if (!props.filter) {
    return [];
  }

  const key = Object.keys(props.filter)[0];

  if (!key) {
    return [];
  }

  const filtered = props.filter[key]?.filter((item) => item.FeatureName === key) ?? [];

  return filtered.map((item) => ({
    value: item.FeatureValue,
    unit: item.FeatureUnit,
    checked: item.checked || false,
    rawFilter: item,
  }));
};

options.value = parseOptions();

const toggleOption = (option: FilterOptions) => {
  option.checked = !option.checked;

  if (option.checked) {
    Emitter.emit('add-filter-option', [option]);
  } else {
    Emitter.emit('remove-filter-option', [option]);
  }
};

const FeatureName = computed(() => {
  return filter.value ? (Object.keys(filter.value)[0] ?? '') : '';
});

const selectedAll = computed(() => {
  return options.value.every((e) => e.checked);
});

const totalProducts = computed(() => {
  return props.filter?.[FeatureName.value]?.reduce((total: number, obj: SearchFiltersCategories) => obj.count + total, 0) ?? 0;
});

const handleAll = () => {
  options.value = options.value?.map((e) => {
    return {
      ...e,
      checked: !selectedAll.value,
    };
  });

  if (selectedAll.value) {
    Emitter.emit('add-filter-option', options.value);
  } else {
    Emitter.emit('remove-filter-option', options.value);
  }
};
</script>
