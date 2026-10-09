<template>
  <div
    class="flex flex-row items-center gap-3 py-2 pl-3 pr-4 border-[1.5px] border-l-[7.5px] border-[#FA4B4B] rounded-lg bg-[#FFF] shadow-m"
  >
    <RedWarning class="w-[55px]" />
    <div class="flex flex-col">
      <div class="">
        <h2 class="text-neutral-700 text-sm font-semibold leading-5">
          There are Back Order items in your cart. <span class="text-[#007FFF]">View items</span>
        </h2>
      </div>
      <p class="text-neutral-700 text-xs font-normal leading-[18px]">
        Items currently not in stock will be dispatched as soon as they become available.
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import RedWarning from '@/assets/icons/red-warning.svg';

export default defineComponent({
  name: 'BackOrderWarning',
  components: {
    RedWarning,
  },
});
</script>
