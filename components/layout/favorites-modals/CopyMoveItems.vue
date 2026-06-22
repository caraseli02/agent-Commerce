<template>
    <div class="fixed z-[70] top-0 left-0 w-screen h-screen flex items-center justify-center pointer-events-none md:z-[60]">
        <div
            class="relative z-10 pointer-events-auto w-[450px] max-w-[calc(100vw-32px)] max-h-[80vh] overflow-y-auto scrollbar-thin py-[15px] pb-[35px] bg-white rounded-md shadow-xs flex flex-col justify-between md:px-[5px]"
        >
            <div class="flex items-center justify-between px-[15px] mb-[34px] md:px-2.5">
                <div class="flex items-center text-slate-500">
                    <CopyIcon v-if="action === 'copy'" class="w-6 h-6 mr-2" />
                    <FolderArrowIcon v-else class="w-6 h-6 mr-2" />
                    <span class="font-medium">
                        {{ action === 'copy' ? 'Copy items to folder' : 'Move items' }}
                    </span>
                </div>
                <button
                    class="rounded w-8 h-8 bg-[#F2F2F2] flex items-center justify-center text-gray-500 transition-colors duration-300 hover:text-slate-500"
                    @click="$emit('close')"
                >
                    <XIcon class="w-5 h-5" />
                </button>
            </div>
            <template v-if="!success">
                <div class="mb-[150px]">
                    <div class="text-sm font-medium px-[15px] mb-[15px] md:px-2.5">Selected items:</div>
                    <div class="grid grid-cols-1 gap-2.5 max-h-[132px] px-[15px] overflow-y-auto scrollbar-thin mb-[15px] md:px-2.5">
                        <template v-for="(item, index) in itemsCopy" :key="index">
                            <LayoutFavoritesCartModalFavoritesFolderItem
                                v-if="item.type === 'folder'"
                                :folder="item"
                                in-modal
                                @select="item.selected = !item.selected"
                            />
                            <LayoutFavoritesCartModalFavoritesProductItem
                                v-else
                                :product="item"
                                in-modal
                                @select="item.selected = !item.selected"
                            />
                        </template>
                    </div>
                    <div class="px-[15px] md:px-2.5">
                        <div class="text-sm font-medium mb-5">{{ action === 'copy' ? 'Copy' : 'Move' }} selected items to:</div>
                        <FormSelect
                            v-model="folder"
                            label="Select destination folder"
                            placeholder="Select Folder"
                            checkboxes
                            :options="options"
                        />
                    </div>
                </div>
                <div class="flex items-center justify-center gap-2.5 px-[15px] md:px-2.5">
                    <button
                        class="flex bg-blue-500 rounded px-[34px] py-[11px] text-sm font-medium text-white"
                        @click="
                            action === 'copy' ? copyItems() : moveItems();
                            success = true;
                        "
                    >
                        {{ action === 'copy' ? 'Copy items' : 'Move items' }}
                    </button>
                    <button class="flex bg-gray-100 rounded px-[26px] py-[11px] text-sm font-medium text-slate-500" @click="$emit('close')">
                        Cancel
                    </button>
                </div>
            </template>
            <div v-else class="flex flex-col items-center flex-1 justify-center px-[15px]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 100 100" class="w-[100px] h-[100px] mb-[25px]">
                    <path fill="#00D395" d="M50 10c22.076 0 40 17.924 40 40S72.076 90 50 90 10 72.076 10 50s17.924-40 40-40Z" />
                    <path
                        stroke="#fff"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="5"
                        d="m37.555 49.41 9.948 8.82L65.01 41.758"
                    />
                </svg>
                <div class="text-xl text-center">Done</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { FavoriteItem, FormSelectOption } from '~~/types';
import XIcon from '@/assets/icons/x.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import FolderArrowIcon from '@/assets/icons/folder-arrow.svg';
import FolderIcon from '@/assets/icons/folder.svg';
import type { FavouriteFolderMoveInterface } from '~/model/favourite-folder/request/favourite-folder.interface';
import { copyEntityToFavouriteList, moveEntityToFavouriteList } from '~/composables/api/favorites';

const props = defineProps({
    items: {
        type: Array as PropType<FavoriteItem[]>,
        required: true,
    },
    targetFolders: {
        type: Array as PropType<FavoriteItem[]>,
        required: true,
    },
    action: {
        type: String as PropType<'copy' | 'move'>,
        required: true,
    },
});

defineEmits(['close']);

const folder = ref<FormSelectOption | undefined>(undefined);
const success = ref(false);
const options = ref<FormSelectOption[]>([]);
const itemsCopy = ref<FavoriteItem[]>(JSON.parse(JSON.stringify(props.items)));

onMounted(() => {
    documentUtil.toggleBodyScroll();
});

const processTargetFolders = () => {
    options.value = props.targetFolders.map((folder) => ({
        value: folder.id,
        label: folder.title,
        icon: FolderIcon,
    }));
};

const copyItemToTarget = async (sourceId: string) => {
    if (!folder.value?.value) {
        return;
    }

    const payload: FavouriteFolderMoveInterface = {
        sourceFolderId: sourceId,
        targetFolderId: folder.value.value,
    };

    await copyEntityToFavouriteList(payload);
};

const moveItemToTarget = async (sourceId: string) => {
    if (!folder.value?.value) {
        return;
    }

    const payload: FavouriteFolderMoveInterface = {
        sourceFolderId: sourceId,
        targetFolderId: folder.value.value,
    };

    await moveEntityToFavouriteList(payload);
};

const copyItems = async () => {
    for (const item of props.items) {
        await copyItemToTarget(item.id);
    }
};

const moveItems = async () => {
    for (const item of props.items) {
        await moveItemToTarget(item.id);
    }
};

processTargetFolders();

onBeforeUnmount(() => {
    documentUtil.toggleBodyScroll();
});
</script>
