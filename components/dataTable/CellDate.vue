<template>
  <div class="min-w-[171px]">
    {{ formattedDate }}
  </div>
</template>

<script setup lang="ts">
import moment from 'moment';

const props = defineProps<{
  inputDateString: string;
}>();

const formattedDate = computed(() => {
  return moment(props.inputDateString).format('DD MMMM YYYY HH:mm');
});
</script>
