<script setup lang="ts">
import { ChevronsUpDown } from '@lucide/vue';

const banks = [
  { value: 'bcr_ron', label: 'BCR Bank', currency: 'RON' },
  { value: 'bcr_usd', label: 'BCR Bank', currency: 'USD' },
  { value: 'uni_ron', label: 'UNI Bank', currency: 'RON' },
  { value: 'patria_ron', label: 'PATRIA Bank', currency: 'RON' },
  { value: 'patria_usd', label: 'PATRIA Bank', currency: 'USD' },
];

const open = ref(false);
const value = ref('');

const emit = defineEmits(['bankSelect']);

const handleSelect = (event: CustomEvent) => {
  if (typeof event.detail.value === 'string') {
    value.value = event.detail.value;
    emit('bankSelect', value.value);
  }
  open.value = false;
};

onMounted(() => {
  value.value = banks[0]?.value ?? '';
});

const selectedBank = computed(() => banks.find((bank) => bank.value === value.value));
</script>

<template>
  <UiPopover v-model:open="open">
    <UiPopoverTrigger class="border-border" as-child>
      <UiButton variant="outline" role="combobox" :aria-expanded="open" class="min-w-[326px] justify-between">
        <p class="flex justify-between w-full text-muted-foreground pr-2">
          <span>{{ selectedBank?.label }}</span>
          <span>{{ selectedBank?.currency }}</span>
        </p>
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </UiButton>
    </UiPopoverTrigger>
    <UiPopoverContent class="min-w-[326px] p-0 border-border">
      <UiCommand>
        <UiCommandInput class="h-9" placeholder="Search bank..." />
        <UiCommandEmpty>No bank found.</UiCommandEmpty>
        <UiCommandList>
          <UiCommandGroup>
            <UiCommandItem
              v-for="bank in banks"
              :key="bank.value"
              :value="bank.value"
              class="justify-between text-foreground hover:text-blue-500 w-full hover:bg-accent"
              :class="{ 'text-blue-500 bg-accent': bank.value === selectedBank?.value }"
              @select="handleSelect"
            >
              {{ bank.label }}
              <span>
                {{ bank.currency }}
              </span>
            </UiCommandItem>
          </UiCommandGroup>
        </UiCommandList>
      </UiCommand>
    </UiPopoverContent>
  </UiPopover>
</template>
