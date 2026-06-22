<template>
  <component :is="iconComponent" />
</template>

<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';
import type { IconName } from '@/types/Icons';

const props = defineProps<{ name: IconName }>();

const iconComponent = defineAsyncComponent(() =>
  import(`lucide-vue-next`).then((icons) => {
    const SelectedIcon = icons[props.name];
    if (!SelectedIcon) {
      throw new Error(`Icon "${props.name}" not found.`);
    }
    return SelectedIcon;
  })
);
</script>
