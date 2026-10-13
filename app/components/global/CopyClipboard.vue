<template>
  <UiButton type="button" variant="ghost" size="icon" class="min-h-11 min-w-11" :aria-label="label || `Copy ${text}`" @click="onCopyClick">
    <component :is="defaultIcon" class="h-5 w-5" aria-hidden="true" />
  </UiButton>
</template>

<script setup lang="ts">
import { CopyIcon, CheckIcon } from '@lucide/vue';
import { useToast } from '@/components/ui/toast/use-toast';

const props = withDefaults(
  defineProps<{
    text: string;
    label?: string;
  }>(),
  {
    label: '',
  },
);
const { toast } = useToast();
const defaultIcon = ref(CopyIcon);

const { copy } = useClipboard();

const onCopyClick = () => {
  copy(props.text);
  defaultIcon.value = CheckIcon;
  setTimeout(() => {
    defaultIcon.value = CopyIcon;
  }, 1000);
  toast({
    title: 'Text copied!',
  });
};
</script>

<style scoped></style>
