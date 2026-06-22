<template>
  <div class="fixed z-[70] top-0 left-0 w-screen h-screen flex items-center justify-center pointer-events-none md:z-[60]">
    <div
      class="relative z-10 pointer-events-auto w-[450px] max-w-[calc(100vw-32px)] min-h-[360px] p-[15px] pb-[35px] bg-white rounded-md shadow-xs flex flex-col justify-between"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center text-slate-500">
          <FolderPlusIcon class="w-6 h-6 mr-2" />
          <span class="font-medium"> Create New Folder </span>
        </div>
        <button
          class="rounded w-8 h-8 bg-[#F2F2F2] flex items-center justify-center text-gray-500 transition-colors duration-300 hover:text-slate-500"
          @click="$emit('close')"
        >
          <XIcon class="w-5 h-5" />
        </button>
      </div>
      <template v-if="!success">
        <label class="block w-full">
          <div class="text-sm mb-[5px]">Folder Name</div>
          <input
            v-model="name"
            type="text"
            placeholder="Enter Folder Name"
            class="bg-transparent w-full px-2.5 py-[5px] border border-border rounded h-[42px] text-sm leading-tight text-neutral-700 focus:outline-none"
          />
        </label>
        <div class="flex items-center justify-center gap-2.5">
          <button
            class="flex bg-blue-500 rounded px-[34px] py-[11px] text-sm font-medium text-white"
            @click="
              success = true;
              createFolder();
            "
          >
            Create Folder
          </button>
          <button class="flex bg-gray-100 rounded px-[26px] py-[11px] text-sm font-medium text-slate-500" @click="$emit('close')">
            Cancel
          </button>
        </div>
      </template>
      <div v-else class="flex flex-col items-center flex-1 justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 100 100" class="w-[100px] h-[100px] mb-[25px]">
          <path fill="#00D395" d="M50 10c22.076 0 40 17.924 40 40S72.076 90 50 90 10 72.076 10 50s17.924-40 40-40Z" />
          <path stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="5" d="m37.555 49.41 9.948 8.82L65.01 41.758" />
        </svg>
        <div class="text-xl text-center">Done</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import XIcon from '@/assets/icons/x.svg';
import FolderPlusIcon from '@/assets/icons/folder-plus.svg';
import type { FavouriteFolderRequestInterface } from '~/model/favourite-folder/request/favourite-folder.interface';
import { addEntityToFavouriteList } from '~/composables/api/favorites';

defineEmits(['close']);

const name = ref('');
const success = ref(false);

onMounted(() => {
  documentUtil.toggleBodyScroll();
});

onBeforeUnmount(() => {
  documentUtil.toggleBodyScroll();
});

const createFolder = async () => {
  const payload: FavouriteFolderRequestInterface = {
    name: name.value,
    isFolder: true,
    products: [],
  };
  await addEntityToFavouriteList(payload);
};
</script>
