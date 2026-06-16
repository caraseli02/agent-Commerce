<script setup lang="ts">
import { SearchIcon } from 'lucide-vue-next';
import type { IconName } from '@/types/Icons'; // Correctly using the imported type
import IconAsync from '@/components/icon/Async.vue';
import { iconList } from '@/data/iconNames';

defineProps<{
  title: string;
}>();

const open = ref(false);
const search = ref('');
const debounced = refDebounced(search, 500);
const selectedIcon = defineModel<IconName | null>();

const filteredIcons = computed(() => {
  // Convert search input to lowercase for case-insensitive comparison
  const searchLower = debounced.value.toLowerCase();
  if (debounced.value) {
    return iconList.filter(icon => icon.toLowerCase().includes(searchLower));
  }
  else {
    return iconList.slice(0, 42); // Optionally start with empty or display default icons
  }
});

function selectIcon(icon: IconName): void {
  selectedIcon.value = icon;
  open.value = false;
  search.value = '';
}
</script>

<template>
  <UiPopover v-model:open="open">
    <UiPopoverTrigger as-child>
      <section class="flex flex-col gap-2 w-fit">
        <div class="text-sm font-medium leading-4 text-zinc-700">
          {{ title }}
        </div>
        <section class="flex items-center gap-4">
          <div
            class="flex flex-col justify-center items-center h-12 w-12 max-w-12 bg-white rounded-lg border border-gray-200 border-solid shadow-sm max-md:px-5"
          >
            <!-- Handle case when no icon is selected by showing a default or placeholder icon -->
            <IconAsync
              v-if="selectedIcon"
              :key="selectedIcon"
              :name="selectedIcon"
              class="aspect-square stroke-1 w-7 h-7"
            />
          </div>
          <UiButton size="lg">
            Upload SVG icon
          </UiButton>
        </section>
      </section>
    </UiPopoverTrigger>
    <UiPopoverContent
      :collision-padding="10"
      class="w-[300px] p-0 flex flex-col gap-4"
    >
      <div class="relative w-full max-w-sm items-center border-b border-gray-300">
        <UiInput
          id="search"
          v-model="search"
          type="text"
          placeholder="Search..."
          class="rounded-xl pl-10 border-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <span class="absolute start-0 inset-y-0 flex items-center justify-center px-2">
          <SearchIcon class="size-5 stroke-1 text-muted-foreground" />
        </span>
      </div>
      <div
        :key="search"
        class="flex content-start flex-wrap gap-2 px-2 pb-4 h-[200px] overflow-y-auto"
      >
        <UiButton
          v-for="icon in filteredIcons"
          :key="icon"
          variant="ghost"
          size="icon"
          @click="selectIcon(icon as IconName)"
        >
          <IconAsync
            :name="icon as IconName"
            class="h-6 w-6 stroke-1"
          />
        </UiButton>
      </div>
    </UiPopoverContent>
  </UiPopover>
</template>
