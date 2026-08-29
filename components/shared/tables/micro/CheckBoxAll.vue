<template>
  <label class="flex cursor-pointer">
    <input :value="checkAll" type="checkbox" class="sr-only" @change="$emit('checkAll')" />
    <div
      class="flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded mt-px border transition-colors duration-300"
      :class="[checkAll ? 'bg-blue-500 border-blue-500 group-hover:bg-white' : 'bg-white  border-border group-hover:border-gray-300']"
    >
      <CheckIcon v-if="checkAll" class="w-4 text-white transition-colors duration-300 group-hover:text-blue-500" />
    </div>
  </label>
</template>

<script lang="ts">
import CheckIcon from '@/assets/icons/check.svg';

export default defineComponent({
  name: 'CheckBoxAll',
  components: {
    CheckIcon,
  },
  // eslint-disable-next-line vue/require-prop-types
  props: ['checkAll'],
  emits: ['checkAll'],
});
</script>
