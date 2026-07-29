<template>
  <div v-if="isMockMode" class="flex flex-col items-center gap-2 px-4 py-3 text-center">
    <p class="text-xs leading-normal text-slate-500 max-w-prose">
      Reset sample cart and smart-pricing data for this browser only. Other reviewer sessions are not affected.
    </p>
    <UiAlertDialog v-model:open="dialogOpen">
      <UiAlertDialogTrigger as-child>
        <UiButton
          data-testid="reset-demo-data-trigger"
          size="sm"
          variant="outline"
          class="border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100"
        >
          Reset demo data
        </UiButton>
      </UiAlertDialogTrigger>
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Reset sample data for this browser?</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            This restores the documented cart and smart-pricing seeds for your current reviewer session. Other browsers and sessions keep
            their own data.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel data-testid="reset-demo-data-cancel">Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction data-testid="reset-demo-data-confirm" :disabled="isResetting" @click="confirmReset">
            {{ isResetting ? 'Resetting…' : 'Reset demo data' }}
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>
    <p v-if="statusMessage" class="text-xs" :class="statusToneClass" role="status" aria-live="polite">
      {{ statusMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToast } from '@/components/ui/toast/use-toast';
import { resetDemoData } from '~/composables/api/demo';
import { useCartStore } from '~/store/cartStore';
import { usePricingStore } from '~/store/pricingStore';

const config = useRuntimeConfig();
const isMockMode = computed(() => Boolean(config.public.MOCK_MODE));
const dialogOpen = ref(false);
const isResetting = ref(false);
const statusMessage = ref('');
const statusTone = ref<'success' | 'error' | ''>('');
const { toast } = useToast();
const cartStore = useCartStore();
const pricingStore = usePricingStore();

const statusToneClass = computed(() => {
  if (statusTone.value === 'success') {
    return 'text-emerald-700';
  }

  if (statusTone.value === 'error') {
    return 'text-red-700';
  }

  return 'text-slate-500';
});

const confirmReset = async () => {
  if (isResetting.value) {
    return;
  }

  isResetting.value = true;
  statusMessage.value = '';
  statusTone.value = '';

  try {
    const response = await resetDemoData();

    if (!response || response.status !== 'success') {
      throw new Error('Reset failed');
    }

    cartStore.setCart(response.data.cart);
    pricingStore.setPricing(response.data.pricing);

    statusTone.value = 'success';
    statusMessage.value = 'Demo data restored to the documented seeds.';
    toast({
      title: 'Demo data reset',
      description: 'Cart and smart-pricing were restored for this browser session.',
      variant: 'success',
    });
    dialogOpen.value = false;
  } catch {
    statusTone.value = 'error';
    statusMessage.value = 'Could not reset demo data. Please try again.';
    toast({
      title: 'Reset failed',
      description: 'Could not restore demo data for this browser session.',
      variant: 'destructive',
    });
  } finally {
    isResetting.value = false;
  }
};
</script>
