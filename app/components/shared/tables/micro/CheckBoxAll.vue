<template>
  <UiCheckbox :checked="checkAll" aria-label="Select All" class="mt-px" @update:checked="$emit('checkAll')" />
</template>

<script lang="ts">
export default defineComponent({
  name: 'CheckBoxAll',
  // eslint-disable-next-line vue/require-prop-types
  props: ['checkAll'],
  emits: ['checkAll'],
});
</script>
