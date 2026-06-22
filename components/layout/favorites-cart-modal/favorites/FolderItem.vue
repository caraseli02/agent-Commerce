<template>
  <div>
    <div
      class="relative flex items-center rounded-md"
      :class="[editing ? 'py-2.5' : 'py-[13px]', inModal ? 'py-0' : 'bg-[#F2F2F2] border border-gray-200 pl-2.5 pr-[5px]']"
    >
      <label v-if="!editing" class="flex cursor-pointer mr-2.5">
        <input :value="folder.selected" type="checkbox" class="sr-only" @change="$emit('select')" />
        <div
          class="flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded mt-px border transition-colors duration-300"
          :class="[
            folder.selected ? 'bg-blue-500 border-blue-500 group-hover:bg-white' : 'bg-white  border-border group-hover:border-gray-300',
          ]"
        >
          <CheckIcon v-if="folder.selected" class="w-4 text-white transition-colors duration-300 group-hover:text-blue-500" />
        </div>
      </label>
      <button class="flex" @click="$emit('open')">
        <FolderIcon
          class="w-9 h-9 mr-[15px] transition-colors duration-300"
          :class="[editing ? 'text-blue-500 ml-[5px]' : 'text-slate-500']"
        />
      </button>
      <label v-if="editing" class="w-full pr-[5px]">
        <input
          ref="newNameInputDOM"
          v-model="newName"
          type="text"
          class="bg-white w-full px-2.5 pt-[11px] pb-2.5 text-sm leading-snug font-Inter border border-border rounded text-neutral-700 transition-colors duration-300 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
      </label>
      <button v-else class="text-left" @click="$emit('open')">
        <div class="text-sm leading-tight font-semibold font-Inter mb-[3px]">
          {{ folder.title }}
        </div>
        <div class="flex items-center text-xs leading-tight font-Inter text-slate-500">
          <div class="flex items-center mr-[15px]">
            <span class="mr-1">Items:</span>
            <span class="font-semibold">{{ folder.items?.length }}</span>
          </div>
          <div class="flex items-center">
            <span class="mr-1">Total:</span>
            <span class="font-semibold">175.413,75 Lei</span>
          </div>
        </div>
      </button>
      <button
        v-if="!editing && !inModal"
        class="flex text-slate-500 transition-colors duration-300 ml-auto hover:text-blue-500"
        @click="
          showOptions = !showOptions;
          $emit('show-options');
        "
      >
        <DotsVerticalIcon class="w-6 h-6" />
      </button>
      <Transition name="fade">
        <div
          v-if="(folder.selected || showOptions) && !editing && !inModal"
          class="absolute top-1/2 right-0 -translate-y-1/2 w-[5px] h-[50px] bg-blue-500 rounded-l-lg"
        />
      </Transition>
    </div>
    <div v-if="editing" class="flex items-center justify-center gap-[15px] mt-[25px] mb-[15px]">
      <button class="flex items-center justify-center w-[42px] h-[42px] bg-[#F5F5F5] rounded-full text-blue-500" @click="editing = false">
        <CheckIcon class="w-6 h-6" />
      </button>
      <button class="flex items-center justify-center w-[42px] h-[42px] bg-[#F5F5F5] rounded-full text-rose-500" @click="editing = false">
        <XIcon class="w-5 h-5" />
      </button>
    </div>
    <div v-else-if="showOptions" class="flex items-center justify-center gap-[15px] mt-[25px] mb-[15px]">
      <button
        class="flex items-center justify-center w-[42px] h-[42px] bg-[#F5F5F5] rounded-full text-slate-500 transition-colors duration-300 hover:text-blue-500"
      >
        <CartIcon class="w-5 h-5" />
      </button>
      <button
        class="flex items-center justify-center w-[42px] h-[42px] bg-[#F5F5F5] rounded-full text-slate-500 transition-colors duration-300 hover:text-blue-500"
        @click="editing = true"
      >
        <PenIcon class="w-5 h-5" />
      </button>
      <button
        class="flex items-center justify-center w-[42px] h-[42px] bg-[#F5F5F5] rounded-full text-slate-500 transition-colors duration-300 hover:text-blue-500"
      >
        <CogIcon class="w-5 h-5" />
      </button>
      <button
        class="flex items-center justify-center w-[42px] h-[42px] bg-[#F5F5F5] rounded-full text-slate-500 transition-colors duration-300 hover:text-blue-500"
        @click="deleteItem = true"
      >
        <TrashIcon class="w-5 h-5" />
      </button>
    </div>
  </div>
  <Teleport to="body">
    <Transition name="slide-from-top">
      <LayoutFavoritesModalsDelete v-if="deleteItem" :products="[folder]" @close="deleteItem = false" />
    </Transition>
    <Transition name="fade">
      <div
        v-if="deleteItem"
        class="fixed z-[60] top-0 left-0 w-full h-full bg-[#333333]/30 backdrop-blur-[2px] cursor-pointer md:z-50"
        @click="deleteItem = false"
      />
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { PropType, Ref } from 'vue';
import type { FavoriteItem } from '~~/types';
import FolderIcon from '@/assets/icons/folder.svg';
import CheckIcon from '@/assets/icons/check.svg';
import DotsVerticalIcon from '@/assets/icons/dots-vertical.svg';
import CartIcon from '@/assets/icons/cart.svg';
import PenIcon from '@/assets/icons/pen.svg';
import CogIcon from '@/assets/icons/cog.svg';
import TrashIcon from '@/assets/icons/trash-can.svg';
import XIcon from '@/assets/icons/x.svg';

const props = defineProps({
  folder: {
    type: Object as PropType<FavoriteItem>,
    required: true,
  },
  inModal: {
    type: Boolean,
    required: false,
  },
});

defineEmits(['select', 'open', 'show-options']);

const showOptions = ref(false);

const newNameInputDOM = ref<HTMLInputElement>();
const editing = ref(false);

const newName = ref(props.folder.title);

const deleteItem = ref(false);

const folderWithActiveOptions = inject<Ref<FavoriteItem | undefined>>('folder-with-active-options');

watch(editing, (newVal) => {
  if (newVal) {
    nextTick(() => {
      if (newNameInputDOM.value) {
        newNameInputDOM.value.focus();
      }
    });
  }
});

watch(
  () => folderWithActiveOptions?.value,
  (activeFolder) => {
    if (activeFolder && activeFolder.id !== props.folder.id) {
      showOptions.value = false;
    }
  }
);
</script>
