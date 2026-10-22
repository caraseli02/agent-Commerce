<template>
  <div class="items-stretch shadow-xs bg-card flex w-full flex-col p-6 rounded-xl">
    <header class="justify-between items-stretch flex gap-5">
      <div class="justify-center items-stretch flex flex-col whitespace-nowrap">
        <div class="text-foreground text-2xl font-semibold leading-7">
          {{ Number(availableCredit).toFixed(2) }}
          Lei
        </div>
        <div class="text-muted-foreground text-xs leading-4 mt-1">Available Credit</div>
      </div>
      <button class="text-slate-300 hover:text-primary">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M10.2002 4.80001C10.2002 3.80589 11.0061 3 12.0002 3C12.9943 3 13.8002 3.80589 13.8002 4.80001C13.8002 5.79413 12.9943 6.60003 12.0002 6.60003C11.0061 6.60003 10.2002 5.79413 10.2002 4.80001ZM10.2002 12C10.2002 11.0059 11.0061 10.2 12.0002 10.2C12.9944 10.2 13.8002 11.0059 13.8002 12C13.8002 12.9941 12.9944 13.8 12.0002 13.8C11.0061 13.8 10.2002 12.9941 10.2002 12ZM12.0002 17.4C11.0061 17.4 10.2002 18.2059 10.2002 19.2C10.2002 20.1941 11.0061 21 12.0002 21C12.9944 21 13.8002 20.1941 13.8002 19.2C13.8002 18.2059 12.9944 17.4 12.0002 17.4Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </header>
    <div class="items-stretch bg-gray-200 flex flex-col justify-center mt-6 pr-12 rounded-[100px] overflow-hidden relative">
      <div
        class="justify-end items-center bg-green-500 flex shrink-0 h-3 flex-col rounded-[100px]"
        :style="{
          width: `${creditShare}%`,
        }"
      />
    </div>
    <form class="justify-between items-stretch flex w-full gap-5 mt-4">
      <div class="items-stretch flex justify-between gap-2 text-sm whitespace-nowrap">
        <span class="text-muted-foreground leading-5 grow">Credit limit:</span>
        <div class="text-foreground font-semibold leading-5 grow">{{ Number(balance).toFixed(2) }} Lei</div>
      </div>
      <div class="flex items-center justify-between gap-2 text-muted-foreground hover:text-primary">
        <SvgoCard16 />
        <button type="submit" class="text-sm font-medium leading-5 grow whitespace-nowrap">Pay now</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  availableCredit: number;
  /** Total credit limit the available amount is measured against. */
  balance: number;
}>();

const creditShare = computed(() =>
  Number(props.balance) > 0 ? Math.min(100, (Number(props.availableCredit) / Number(props.balance)) * 100) : 0,
);
</script>

<style scoped></style>
