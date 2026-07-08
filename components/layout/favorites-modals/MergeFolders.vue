<template>
  <div class="fixed z-[70] top-0 left-0 w-screen h-screen flex items-center justify-center pointer-events-none md:z-[60]">
    <div
      class="relative z-10 pointer-events-auto w-[450px] max-w-[calc(100vw-32px)] max-h-[80vh] overflow-y-auto scrollbar-thin p-[15px] pb-[35px] bg-white rounded-md shadow-xs flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-[34px]">
        <div class="flex items-center text-slate-500">
          <MergeIcon class="w-6 h-6 mr-2" />
          <span class="font-medium"> Merge folders </span>
        </div>
        <button
          class="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-[#F2F2F2] text-gray-500 transition-colors duration-300 leading-none hover:text-slate-500"
          @click="$emit('close')"
        >
          <XIcon class="w-5 h-5" />
        </button>
      </div>
      <template v-if="!success">
        <div class="mb-[150px]">
          <div class="text-sm font-medium mb-[15px]">Selected folders:</div>
          <div class="grid grid-cols-1 gap-2.5 max-h-[132px] overflow-y-auto scrollbar-thin mb-[15px]">
            <LayoutFavoritesCartModalFavoritesFolderItem
              v-for="(f, index) in foldersCopy"
              :key="index"
              :folder="f"
              in-modal
              @select="f.selected = !f.selected"
            />
          </div>
          <div>
            <div class="text-sm font-medium mb-5">Merge selected folders to:</div>
            <FormSelect v-model="folder" label="Select destination folder" placeholder="Select Folder" checkboxes :options="options" />
          </div>
        </div>
        <div class="flex items-center justify-center gap-2.5">
          <button
            class="flex bg-blue-500 rounded px-[34px] py-[11px] text-sm font-medium text-white"
            @click="
              mergeItems();
              success = true;
            "
          >
            Merge
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
import type { PropType } from 'vue';
import XIcon from '@/assets/icons/x.svg';
import MergeIcon from '@/assets/icons/merge.svg';
import FolderIcon from '@/assets/icons/folder.svg';
import type { FavoriteItem, FormSelectOption } from '~~/types';
import type { FavouriteFolderMoveInterface } from '~/model/favourite-folder/request/favourite-folder.interface';
import { moveEntityToFavouriteList } from '~/composables/api/favorites';

const props = defineProps({
  folders: {
    type: Array as PropType<FavoriteItem[]>,
    required: true,
  },
  targetFolders: {
    type: Array as PropType<FavoriteItem[]>,
    required: true,
  },
});

defineEmits(['close']);

const folder = ref<FormSelectOption | undefined>(undefined);
const success = ref(false);
const options = ref<FormSelectOption[]>([]);

const foldersCopy = ref(JSON.parse(JSON.stringify(props.folders)));

const processTargetFolders = () => {
  options.value = props.targetFolders.map((folder) => ({
    value: folder.id,
    label: folder.title,
    icon: FolderIcon,
  }));
};

const mergeItemToTarget = async (sourceId: string) => {
  if (!folder.value?.value) {
    return;
  }

  const payload: FavouriteFolderMoveInterface = {
    sourceFolderId: sourceId,
    targetFolderId: folder.value.value,
  };

  await moveEntityToFavouriteList(payload);
};

const mergeItems = async () => {
  for (const item of props.folders) {
    await mergeItemToTarget(item.id);
  }
};

processTargetFolders();

onMounted(() => {
  documentUtil.toggleBodyScroll();
});

onBeforeUnmount(() => {
  documentUtil.toggleBodyScroll();
});
</script>
