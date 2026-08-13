<template>
  <component :is="iconComponent" />
</template>

<script lang="ts" setup>
import { defineAsyncComponent, type Component } from 'vue';
import type { IconName } from '@/types/Icons';

const props = defineProps<{ name: IconName }>();

const iconComponent = defineAsyncComponent(() =>
  import(`@lucide/vue`).then((icons) => {
    const SelectedIcon = icons[props.name];
    if (!SelectedIcon) {
      throw new Error(`Icon "${props.name}" not found.`);
    }
    return SelectedIcon as Component;
  }),
);
</script>
