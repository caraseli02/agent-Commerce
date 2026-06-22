<template>
  <component :is="defaultIcon" @click="onCopyClick" />
</template>

<script setup lang="ts">
import { CopyIcon, CheckIcon } from 'lucide-vue-next';
import { useToast } from '@/components/ui/toast/use-toast';

const props = defineProps<{
  text: string;
}>();
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
