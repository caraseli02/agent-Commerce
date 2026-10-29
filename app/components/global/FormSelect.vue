<template>
  <div class="relative" :class="[error ? 'mb-4' : '']">
    <div v-if="label" class="text-sm text-muted-foreground mb-1">
      {{ label }}
    </div>
    <UiButton
      type="button"
      variant="outline"
      class="w-full justify-between px-3"
      :class="[
        error ? 'border-red' : showOptions ? 'border-blue-500' : '',
        disabled && showDisabledStyles
          ? 'disabled:bg-muted disabled:text-muted-foreground disabled:border-border disabled:shadow-none'
          : 'disabled:opacity-100',
        size === 'lg' ? 'h-11' : 'h-10',
      ]"
      :disabled="disabled"
      @click="showOptions = !showOptions"
    >
      <span
        class="flex items-center text-left truncate"
        :class="{
          'text-muted-foreground': !modelValue,
          'font-semibold text-muted-foreground': checkboxes,
        }"
      >
        <component :is="icon" v-if="icon" class="w-6 h-6 text-muted-foreground mr-2" />
        <img
          v-if="modelValue?.icon && typeof modelValue.icon === 'string'"
          :src="modelValue.icon"
          :alt="modelValue.label"
          class="w-8 rounded mr-2"
          loading="lazy"
        />
        <component :is="modelValue.icon" v-else-if="modelValue?.icon" class="w-6 h-6 text-muted-foreground mr-2" />
        <span :class="[disabled ? 'text-muted-foreground' : 'text-muted-foreground']">
          {{ modelValue?.label || placeholder }}
        </span>
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        fill="none"
        class="w-5 h-5 transition-all duration-300"
        :class="[showOptions ? 'rotate-180' : '', disabled ? 'text-muted-foreground' : 'text-muted-foreground']"
      >
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="m5.836 8.332 4.167 3.333 4.166-3.333"
        />
      </svg>
    </UiButton>
    <Transition name="fade-full">
      <div
        v-if="showOptions"
        v-click-outside="() => (showOptions = false)"
        class="absolute -bottom-1 left-0 translate-y-full w-full bg-card rounded-md overflow-y-auto scrollbar-thin shadow-m px-3 py-[15px]"
        :class="[checkboxes ? 'max-h-[200px]' : 'max-h-[250px]']"
      >
        <div v-if="search" class="mb-[15px]">
          <div class="text-sm text-muted-foreground mb-[5px]">Search {{ label }}</div>
          <!-- The label draws the border and focus state (and focuses the input from the icon), so the input drops its own. -->
          <UiLabel class="relative flex items-center border border-border rounded px-3 focus-within:border-blue-500">
            <SearchIcon class="w-[18px] h-[18px] text-muted-foreground" />
            <UiInput
              v-model="searchValue"
              type="search"
              :placeholder="`Search ${label}`"
              class="h-auto flex-1 border-0 bg-transparent pl-2 pr-8 py-[9px] text-sm font-normal focus-visible:!outline-none"
            />
            <Transition name="fade">
              <UiButton
                v-if="searchValue"
                type="button"
                variant="ghost"
                size="icon"
                class="h-8 w-8 shrink-0"
                aria-label="Clear search"
                @click="searchValue = ''"
              >
                <XIcon class="w-[18px] h-[18px] text-muted-foreground" aria-hidden="true" />
              </UiButton>
            </Transition>
          </UiLabel>
        </div>
        <UiRadioGroup v-if="checkboxes" :model-value="modelValue?.value" class="gap-0" @update:model-value="radioHandler">
          <UiLabel
            v-for="(option, index) in filteredOptions"
            :key="index"
            class="group flex items-center cursor-pointer py-[9px] px-2.5 transition-colors duration-300 hover:bg-accent rounded-[5px]"
          >
            <UiRadioGroupItem :value="option.value" class="sr-only" />
            <div
              class="flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded mt-px border transition-colors duration-300 mr-2.5"
              :class="[
                option.value === modelValue?.value ? 'bg-blue-500 border-blue-500 ' : 'bg-card  border-border group-hover:border-border',
              ]"
            >
              <CheckIcon v-if="option.value === modelValue?.value" class="w-4 text-white" />
            </div>
            <component :is="option.icon" v-if="option.icon" class="w-6 h-6 text-muted-foreground mr-2" />
            <span
              class="text-sm font-Inter text-muted-foreground font-semibold truncate transition-colors duration-300 group-hover:text-foreground"
              :class="[option.value === modelValue?.value ? 'text-foreground' : '']"
            >
              {{ option.label }}
            </span>
          </UiLabel>
        </UiRadioGroup>
        <template v-else>
          <UiButton
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            variant="ghost"
            class="h-auto w-full justify-start whitespace-normal px-2.5 py-[9px] text-left"
            :class="[option.value === modelValue?.value ? 'text-blue-500' : '']"
            @click="inputHandler(option)"
          >
            <img
              v-if="option?.icon && typeof option.icon === 'string'"
              :src="option?.icon"
              :alt="option.label"
              class="w-8 rounded mr-2"
              loading="lazy"
            />
            <component :is="option.icon" v-else-if="option?.icon" class="w-6 h-6 mr-2" />
            <span>
              {{ option.label }}
            </span>
          </UiButton>
        </template>
      </div>
    </Transition>
    <Transition name="fade">
      <div v-if="error" class="absolute -bottom-1 left-0 translate-y-full pointer-events-none text-xs leading-normal text-rose-500">
        {{ error }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { FormSelectOption } from '~~/types';
import CheckIcon from '@/assets/icons/check.svg';
import SearchIcon from '@/assets/icons/search.svg';
import XIcon from '@/assets/icons/x.svg';

const props = defineProps({
  modelValue: {
    type: Object as PropType<FormSelectOption>,
    required: false,
    default: undefined,
  },
  label: {
    type: String,
    default: undefined,
  },
  placeholder: {
    type: String,
    default: undefined,
  },
  options: {
    type: Array as PropType<FormSelectOption[]>,
    required: true,
  },
  size: {
    type: String as PropType<'default' | 'lg'>,
    required: false,
    default: 'default',
  },
  disabled: Boolean,
  checkboxes: Boolean,
  // eslint-disable-next-line vue/require-prop-types
  icon: {
    required: false,
    default: undefined,
  },
  search: Boolean,
  error: {
    type: String,
    default: undefined,
  },
  showDisabledStyles: {
    type: Boolean,
    required: false,
    default: true,
  },
});

const emits = defineEmits(['update:modelValue']);

const searchValue = ref('');

const showOptions = ref(false);

const filteredOptions = computed(() => {
  return props.options.filter((e) => {
    return e.label.toLowerCase().includes(searchValue.value.toLowerCase());
  });
});

const inputHandler = (option: FormSelectOption) => {
  emits('update:modelValue', option);
  showOptions.value = false;
};

const radioHandler = (value: string) => {
  const option = filteredOptions.value.find((e) => e.value === value);

  if (option) {
    inputHandler(option);
  }
};
</script>
