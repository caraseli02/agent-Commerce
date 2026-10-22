<script setup lang="ts">
import { Clock, FileText } from '@lucide/vue';
import EmojiSadIcon from '@/assets/icons/dashboard/emoji-sad.svg';

defineProps<{
  items: { shortId: string; id: string }[];
}>();
</script>

<template>
  <div
    class="relative justify-between items-stretch shadow-xs bg-card flex w-full lg:w-fit md:min-w-[476px] xl:min-w-[472px] h-[240px] flex-col p-4 md:p-6 rounded-xl"
  >
    <template v-if="items.length > 0">
      <div class="items-stretch flex justify-between gap-4">
        <div class="justify-center items-stretch flex grow basis-[0%] flex-col">
          <div class="text-foreground text-base font-semibold leading-6 flex justify-between">
            Outstanding Invoices
            <Clock class="stroke-1 w-5 h-5 text-muted-foreground" />
          </div>
          <div class="flex gap-1.5 mt-4 mb-1 flex-wrap lg:max-w-[424px]">
            <NuxtLink
              v-for="item in items"
              :key="item.id"
              :to="`/order-summary/${item.id}`"
              class="w-fit text-muted-foreground hover:text-primary text-[12px] leading-5 font-medium flex justify-center items-center bg-muted px-[6px] rounded-3xl"
            >
              {{ formatOrderRef(item.shortId) }}
            </NuxtLink>
          </div>
        </div>
      </div>
      <div class="items-stretch flex justify-end gap-3">
        <UiButton as-child>
          <NuxtLink to="/dashboard/client?tab=orders" class="inline-flex items-center justify-center">
            <FileText class="w-4 h-4 mr-2 text-white" />
            <div class="text-white text-sm font-medium leading-6 grow whitespace-nowrap">View All Invoices</div>
          </NuxtLink>
        </UiButton>
      </div>
    </template>
    <section v-else class="absolute inset-0 flex flex-col items-center justify-center text-center">
      <EmojiSadIcon class="w-[52px] h-[52px] mb-4" />
      <div class="w-full">No results.</div>
    </section>
  </div>
</template>

<style scoped></style>
