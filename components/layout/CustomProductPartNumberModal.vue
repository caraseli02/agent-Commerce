<template>
  <div class="fixed z-[60] top-0 left-0 w-screen h-screen flex items-center justify-center">
    <div class="relative z-10 w-[450px] max-w-[calc(100vw-32px)] px-[15px] pt-5 pb-[35px] bg-white rounded-md shadow-xs md:px-5">
      <div
        class="flex items-center justify-between mb-[38px] transition-opacity duration-300"
        :class="[submitSuccess ? 'opacity-0 pointer-events-none' : '']"
      >
        <div class="flex items-center">
          <BarCodeIcon class="w-7 h-7 mr-2" />
          <span class="text-lg font-medium text-slate-500">Add custom part number</span>
        </div>
        <button
          class="rounded w-8 h-8 bg-[#F2F2F2] flex items-center justify-center text-gray-500 transition-colors duration-300 hover:text-slate-500"
          @click="$emit('close')"
        >
          <XIcon class="w-[15px] h-[15px]" />
        </button>
      </div>
      <div
        class="flex flex-col items-center px-[5px] transition-opacity duration-300 md:px-[15px]"
        :class="[submitSuccess ? 'opacity-0 pointer-events-none' : '']"
      >
        <label class="block w-full">
          <div class="text-sm mb-[5px]">Manufacturer part number:</div>
          <input
            :value="partNumber"
            readonly
            type="text"
            class="bg-transparent w-full px-2.5 py-[5px] border border-border rounded h-[42px] text-xl font-semibold leading-tight text-neutral-700 focus:outline-none"
          />
        </label>
        <ArrowDownIcon class="w-6 h-6 my-[15px]" />
        <label class="block w-full mb-[43px]">
          <input
            v-model="customNumber"
            :aria-invalid="!isCustomNumberValid"
            aria-describedby="custom-part-number-help"
            type="text"
            placeholder="Type your custom part number here"
            class="bg-transparent w-full px-2.5 py-[9px] border border-border rounded h-[42px] text-sm focus:outline-none"
          />
          <p id="custom-part-number-help" class="mt-2 text-sm text-slate-500">
            {{ isCustomNumberValid ? 'Save is ready.' : 'Enter a custom part number to enable Save.' }}
          </p>
        </label>
        <div class="flex gap-2.5">
          <button
            class="flex bg-blue-500 rounded px-[34px] py-[11px] text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!isCustomNumberValid"
            @click="handleSave"
          >
            Save
          </button>
          <button class="flex bg-gray-100 rounded px-[26px] py-[11px] text-sm font-medium text-slate-500" @click="$emit('close')">
            Cancel
          </button>
        </div>
      </div>
      <Transition name="fade">
        <div v-if="submitSuccess" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <CheckIcon class="w-[140px] h-[140px] bg-green-500 mb-5" />
          <div class="text-2xl text-slate-500">Saved</div>
        </div>
      </Transition>
    </div>
    <div class="absolute top-0 left-0 w-full h-full bg-[#333333]/70 backdrop-blur-[2px] cursor-pointer" @click="$emit('close')" />
  </div>
</template>

<script setup lang="ts">
import XIcon from '@/assets/icons/x.svg';
import BarCodeIcon from '@/assets/icons/barcode.svg';
import ArrowDownIcon from '@/assets/icons/arrow-down.svg';
import CheckIcon from '@/assets/icons/check-circle.svg';

const emits = defineEmits(['close']);
const props = defineProps<{
  manufacturerCode?: string;
}>();

const partNumber = ref(props.manufacturerCode ?? 'ADIN2111BCPZ');
const customNumber = ref('');
const isCustomNumberValid = computed(() => customNumber.value.trim().length > 0);

const submitSuccess = ref(false);

const handleSave = () => {
  if (!isCustomNumberValid.value) {
    return;
  }

  submitSuccess.value = true;
};

watch(submitSuccess, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      emits('close');
    }, 2000);
  }
});

onMounted(() => {
  documentUtil.toggleBodyScroll();
});

onBeforeUnmount(() => {
  documentUtil.toggleBodyScroll();
});
</script>
