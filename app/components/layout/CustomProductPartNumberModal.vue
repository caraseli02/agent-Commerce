<template>
  <UiDialog :open="isOpen" @update:open="onOpenChange">
    <UiDialogContent
      class="w-[450px] max-w-[calc(100vw-32px)] gap-0 border-none px-[15px] pt-5 pb-[35px] shadow-xs md:px-5 [&>button.absolute]:hidden"
    >
      <div
        class="mb-[38px] flex items-center justify-between transition-opacity duration-300"
        :class="[submitSuccess ? 'pointer-events-none opacity-0' : '']"
      >
        <div class="flex items-center">
          <BarCodeIcon class="mr-2 h-7 w-7" />
          <span class="text-lg font-medium text-muted-foreground">Add custom part number</span>
        </div>
        <UiDialogClose as-child>
          <UiButton
            variant="ghost"
            size="icon"
            class="h-8 w-8 rounded bg-accent text-muted-foreground hover:bg-accent hover:text-muted-foreground"
            aria-label="Close"
          >
            <XIcon class="h-[15px] w-[15px]" />
          </UiButton>
        </UiDialogClose>
      </div>

      <div
        class="flex flex-col items-center px-[5px] transition-opacity duration-300 md:px-[15px]"
        :class="[submitSuccess ? 'pointer-events-none opacity-0' : '']"
      >
        <div class="block w-full">
          <UiLabel class="mb-[5px] block font-normal">Manufacturer part number:</UiLabel>
          <UiInput
            :model-value="partNumber"
            readonly
            type="text"
            class="h-[42px] border-border bg-transparent px-2.5 py-[5px] text-xl font-semibold leading-tight text-foreground"
          />
        </div>

        <ArrowDownIcon class="my-[15px] h-6 w-6" />

        <div class="mb-[43px] block w-full">
          <UiInput
            id="custom-part-number"
            v-model="customNumber"
            :aria-invalid="!isCustomNumberValid"
            aria-describedby="custom-part-number-help"
            type="text"
            placeholder="Type your custom part number here"
            class="h-[42px] border-border bg-transparent px-2.5 py-[9px] text-sm"
          />
          <p id="custom-part-number-help" class="mt-2 text-sm text-muted-foreground">
            {{ isCustomNumberValid ? 'Save is ready.' : 'Enter a custom part number to enable Save.' }}
          </p>
        </div>

        <div class="flex gap-2.5">
          <UiButton class="px-[34px] py-[11px]" :disabled="!isCustomNumberValid" @click="handleSave"> Save </UiButton>
          <UiButton variant="secondary" class="px-[26px] py-[11px] text-muted-foreground" @click="closeModal"> Cancel </UiButton>
        </div>
      </div>

      <Transition name="fade">
        <div v-if="submitSuccess" class="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <CheckIcon class="mb-5 h-[140px] w-[140px] bg-green-500" />
          <div class="text-2xl text-muted-foreground">Saved</div>
        </div>
      </Transition>
    </UiDialogContent>
  </UiDialog>
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

const isOpen = ref(true);
const partNumber = ref(props.manufacturerCode ?? 'ADIN2111BCPZ');
const customNumber = ref('');
const isCustomNumberValid = computed(() => customNumber.value.trim().length > 0);
const submitSuccess = ref(false);

const closeModal = () => {
  isOpen.value = false;
};

const onOpenChange = (open: boolean) => {
  isOpen.value = open;

  if (!open) {
    emits('close');
  }
};

const handleSave = () => {
  if (!isCustomNumberValid.value) {
    return;
  }

  submitSuccess.value = true;
};

watch(submitSuccess, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      closeModal();
    }, 2000);
  }
});
</script>
