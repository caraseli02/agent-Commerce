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

<script lang="ts">
import Emitter from 'tiny-emitter/instance.js';
import EditBig from '~/assets/icons/edit-big.svg';

const lastNote = ref('');

type NoteSectionInstance = {
  note: string;
  rows: number;
};

export default defineComponent({
  name: 'NoteSection',
  components: {
    EditBig,
  },
  data() {
    return {
      textBoxOpen: false,
      note: '',
      rows: 2,
    };
  },
  methods: {
    adjustHeight(this: NoteSectionInstance) {
      this.rows = this.note.split('\n').length;
      if (this.rows > 6) {
        this.rows = 6;
      }
      if (this.rows < 2) {
        this.rows = 2;
      }
    },
    UpdateNote(this: NoteSectionInstance) {
      if (this.note !== lastNote.value) {
        Emitter.emit('note', this.note);
        lastNote.value = this.note;
      }
    },
  },
});
</script>
