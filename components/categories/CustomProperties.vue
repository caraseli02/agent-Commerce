<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(
  defineProps<{
    avgItemWeight?: string;
    length?: string;
    width?: string;
    height?: string;
    enabled?: boolean;
  }>(),
  {
    avgItemWeight: '',
    length: '',
    width: '',
    height: '',
    enabled: false,
  }
);

const customProperties = ref(props.enabled);
const avgWeightValue = ref(props.avgItemWeight);
const widthValue = ref(props.width);
const heightValue = ref(props.height);
const lengthValue = ref(props.length);

const emit = defineEmits<{
  (e: 'update:weight', value: string): void;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  (e: 'update:width', value: string): void;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  (e: 'update:length', value: string): void;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  (e: 'update:height', value: string): void;
  (e: 'update:enabled', value: boolean): void;
}>();

const onInput = (event: Event, field: 'weight' | 'width' | 'length' | 'height') => {
  const value = (event.target as HTMLInputElement).value;
  switch (field) {
    case 'weight':
      emit('update:weight', value);
      break;
    case 'width':
      emit('update:width', value);
      break;
    case 'length':
      emit('update:length', value);
      break;
    case 'height':
      emit('update:height', value);
      break;
  }
};

watch(
  () => customProperties.value,
  (value) => {
    emit('update:enabled', value);
  },
  { immediate: true }
);
</script>

<template>
  <section>
    <div class="flex items-center justify-between space-x-2 mb-6">
      <UiLabel for="airplane-mode"> Custom Properties </UiLabel>
      <UiSwitch id="airplane-mode" v-model:checked="customProperties" />
    </div>
    <div v-if="customProperties">
      <div class="flex flex-col items-start gap-4">
        <UiLabel for="avg-weight" class="text-right"> Average Item Weight </UiLabel>
        <UiInput id="avg-weight" v-model="avgWeightValue" class="col-span-3" @input="onInput($event, 'weight')" />
      </div>
      <div class="flex flex-col items-start gap-4 mt-5">
        <UiLabel for="item-length" class="text-right"> Item Length </UiLabel>
        <UiInput id="item-length" v-model="lengthValue" class="col-span-3" @input="onInput($event, 'length')" />
      </div>
      <div class="flex flex-col items-start gap-4 mt-5">
        <UiLabel for="item-width" class="text-right"> Item Width </UiLabel>
        <UiInput id="item-width" v-model="widthValue" class="col-span-3" @input="onInput($event, 'width')" />
      </div>
      <div class="flex flex-col items-start gap-4 mt-5">
        <UiLabel for="item-height" class="text-right"> Item Height </UiLabel>
        <UiInput id="item-height" v-model="heightValue" class="col-span-3" @input="onInput($event, 'height')" />
      </div>
    </div>
  </section>
</template>
