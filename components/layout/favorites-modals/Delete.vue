<template>
  <UiDialog :open="isOpen" @update:open="isOpen = $event">
    <UiDialogContent>
      <div class="flex items-center justify-between">
        <div class="flex items-center text-slate-500">
          <TrashIcon class="w-6 h-6 mr-2" />
          <span class="font-medium">
            Delete
            {{ isFolder ? 'Folder' : 'Item' + (products.length > 1 ? 's' : '') }}
          </span>
        </div>
      </div>
      <template v-if="!success">
        <div class="text-sm text-center">
          Delete
          <template v-if="isFolder && products.length === 1">
            folder <span class="text-blue-500">{{ products[0].title }}</span>
          </template>
          <template v-else> selected item{{ products.length > 1 ? 's' : '' }} </template>
          ?
        </div>
        <div class="flex items-center justify-center gap-2.5">
          <button
            class="flex bg-blue-500 rounded px-[34px] py-[11px] text-sm font-medium text-white"
            @click="
              deleteItem(products);
              success = true;
            "
          >
            Delete
          </button>
          <button class="flex bg-gray-100 rounded px-[26px] py-[11px] text-sm font-medium text-slate-500" @click="isOpen = !isOpen">
            Cancel
          </button>
        </div>
      </template>
      <div v-else class="flex flex-col items-center flex-1 justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 100 100" class="w-[100px] h-[100px] mb-[25px]">
          <path
            fill="#FA4B4B"
            d="m19.082 26.836 5.509 60.552a2.877 2.877 0 0 0 2.881 2.61h46.06a2.875 2.875 0 0 0 2.879-2.608l5.507-60.554M70.902 84.255H30.09l-5.211-57.42h51.259l-5.236 57.42Z"
          />
          <path
            fill="#FA4B4B"
            d="M41.867 75.45v-.011l-2.881-40.194a2.882 2.882 0 0 0-3.082-2.667 2.882 2.882 0 0 0-2.674 3.076l2.878 40.192a2.875 2.875 0 0 0 2.881 2.667h.208a2.873 2.873 0 0 0 2.67-3.063Z"
          />
          <path
            fill="#FA4B4B"
            d="M50.503 32.58a2.877 2.877 0 0 0-2.882 2.872v40.194a2.876 2.876 0 0 0 2.955 2.796 2.874 2.874 0 0 0 2.804-2.796V35.452a2.875 2.875 0 0 0-2.877-2.872Z"
          />
          <path
            fill="#FA4B4B"
            d="M65.1 32.578a2.88 2.88 0 0 0-3.082 2.665l-2.881 40.196a2.872 2.872 0 0 0 2.66 3.072h.218a2.878 2.878 0 0 0 2.881-2.667l2.878-40.194a2.88 2.88 0 0 0-2.674-3.072Z"
          />
          <path
            fill="#FA4B4B"
            d="M81.916 27.225h3.13a2.875 2.875 0 0 0 2.952-2.797 2.873 2.873 0 0 0-2.952-2.945H64.895v-2.87c0-4.757-3.867-8.613-8.637-8.613H44.743c-4.77 0-8.637 3.856-8.637 8.613v2.87H15.954a2.876 2.876 0 0 0-2.953 2.799 2.876 2.876 0 0 0 2.953 2.943h65.962Zm-40.053-8.612a2.877 2.877 0 0 1 2.88-2.871h11.515c1.59 0 2.88 1.286 2.88 2.871v2.87H41.864v-2.87h-.002Z"
          />
        </svg>
        <div class="text-xl text-center">Deleted</div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import TrashIcon from '@/assets/icons/trash-can.svg';
import type { FavoriteItem } from '~~/types';
import { useCart } from '~/composables/useCart';
import { removeEntityFromFavouriteList } from '~/composables/api/favorites';
const { removeFromCart } = useCart();
const isOpen = defineModel<boolean>();

const props = defineProps({
  products: {
    type: Array as PropType<FavoriteItem[]>,
    required: true,
  },
  deleteFromCart: {
    type: Boolean,
    required: false,
  },
  removeOnlyStockQuantity: {
    type: Boolean,
    required: false,
    default: false,
  },
  removeOnlyBackstockQuantity: {
    type: Boolean,
    required: false,
    default: false,
  },
});

const emits = defineEmits(['close', 'removed']);

const success = ref(false);

const isFolder = computed(() => {
  return (props.products as FavoriteItem[]).every((e) => e.type === 'folder');
});

const deleteItem = async (items: FavoriteItem[] = []) => {
  if (!props.deleteFromCart) {
    for (const item of items) {
      await removeEntityFromFavouriteList(item.id);
    }
  } else {
    const payload = {
      products: [items[0].id],
      removeOnlyStockQuantity: props.removeOnlyStockQuantity ?? false,
      removeOnlyBackstockQuantity: props.removeOnlyBackstockQuantity ?? false,
    };

    const removed = (await removeFromCart(payload)) as { status?: string };

    if (removed.status === 'success') {
      // Emitter.emit('delete-product-item', {
      //     id: items[0].id,
      // });
      emits('removed');
    }
  }
};

onMounted(() => {
  documentUtil.toggleBodyScroll();
});

onBeforeUnmount(() => {
  documentUtil.toggleBodyScroll();
});
</script>
