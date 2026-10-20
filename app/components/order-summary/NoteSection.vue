<template>
  <div class="p-4 xl:p-6 flex flex-col gap-6 bg-[#FFF] rounded-xl shadow-xs mb-6">
    <div class="flex flex-row justify-between w-full">
      <span class="text-neutral-700 text-base font-medium leading-6">Add a note for this order</span>
      <button
        type="button"
        aria-label="Edit order note"
        :aria-expanded="textBoxOpen"
        aria-controls="order-note"
        class="group flex h-11 w-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-blue-500"
        @click="textBoxOpen = !textBoxOpen"
      >
        <EditBig class="h-5 w-5 text-slate-600 group-hover:text-blue-500 transition duration-300" aria-hidden="true" />
      </button>
    </div>
    <div v-if="textBoxOpen">
      <textarea
        id="order-note"
        v-model="note"
        aria-label="Order note"
        :rows="rows"
        maxlength="170"
        class="thin-scrollbar w-full p-3 text-neutral-700 text-sm font-normal leading-6 bg-slate-50 rounded-lg border border-slate-300 resize-none focus-visible:outline-2 focus-visible:outline-blue-500"
        placeholder="Type your note here..."
        @input="adjustHeight"
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

<style scoped>
.thin-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.thin-scrollbar::-webkit-scrollbar-track {
  background: #f9f9f9;
}

.thin-scrollbar::-webkit-scrollbar-thumb {
  background-color: #d4d4d4;
  border-radius: 20px;
  border: 3px solid #f9f9f9;
}
</style>
