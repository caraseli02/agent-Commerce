<template>
  <div class="p-4 xl:p-6 flex flex-col gap-6 bg-card rounded-xl shadow-xs mb-6">
    <div class="flex flex-row justify-between w-full">
      <span class="text-foreground text-base font-medium leading-6">Add a note for this order</span>
      <UiButton variant="ghost" size="icon" aria-label="Edit order note" @click="textBoxOpen = !textBoxOpen">
        <EditBig />
      </UiButton>
    </div>
    <div v-if="textBoxOpen">
      <UiTextarea
        v-model="note"
        :rows="rows"
        maxlength="170"
        class="w-full"
        placeholder="Type your note here..."
        @update:model-value="adjustHeight"
        @focusout="UpdateNote"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import EditBig from '~/assets/icons/edit-big.svg';

const emit = defineEmits<{
  note: [note: string];
}>();

const textBoxOpen = ref(false);
const note = ref('');
const lastNote = ref('');
const rows = ref(2);

const adjustHeight = () => {
  rows.value = Math.min(6, Math.max(2, note.value.split('\n').length));
};

const UpdateNote = () => {
  if (note.value !== lastNote.value) {
    emit('note', note.value);
    lastNote.value = note.value;
  }
};
</script>
