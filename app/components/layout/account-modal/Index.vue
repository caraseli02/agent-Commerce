<template>
  <UiSheet :open="isOpen" @update:open="onOpenChange">
    <UiSheetContent
      side="right"
      hidde-close-button
      overlay-class-name="z-[60] bg-[rgba(47,50,65,0.10)] backdrop-blur-[7.5px]"
      class="z-[60] flex h-full w-full max-w-none flex-col gap-0 overflow-y-auto border-none p-0 shadow-none scrollbar-thin md:w-[440px] sm:max-w-none min-h-[100dvh]"
      @open-auto-focus="handleOpenAutoFocus"
    >
      <header class="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:px-6">
        <UiSheetTitle class="truncate text-lg font-semibold text-foreground">
          {{ loggedInUser ? 'Your account' : 'Sign in' }}
        </UiSheetTitle>
        <UiSheetClose as-child>
          <UiButton
            ref="closeButtonRef"
            variant="ghost"
            size="icon"
            class="inline-flex h-11 w-11 shrink-0 rounded-lg bg-accent hover:bg-secondary"
            aria-label="Close account panel"
          >
            <XIcon class="h-5 w-5 text-muted-foreground hover:text-blue-500" />
          </UiButton>
        </UiSheetClose>
      </header>

      <div class="flex flex-1 flex-col px-4 py-4 md:px-6 md:py-5">
        <div v-if="loggedInUser" class="pb-4">
          <LayoutAccountModalDetails />
        </div>
        <div v-if="!loggedInUser" class="flex flex-1 flex-col">
          <section>
            <p class="mb-4 text-xs leading-5 text-muted-foreground">
              Choose a demo role to continue. Passwords stay private unless you enter one.
            </p>
            <LayoutAccountModalForm @signed-in="handleSignedIn" />
          </section>
          <p class="mt-auto flex flex-wrap items-center justify-center gap-2 pt-5 text-xs text-muted-foreground">
            <SvgoMenuHelp class="h-4 w-4 !text-xs text-muted-foreground" />
            For assistance please contact
            <a href="mailto:support@demo.app" class="text-blue-500 hover:text-blue-400 hover:underline"> support@demo.app </a>
          </p>
        </div>
        <section v-else class="flex h-full flex-col justify-between">
          <div class="flex flex-1 flex-col gap-6">
            <LayoutAccountModalCredits />
            <LayoutAccountModalLinks @close="emit('close')" />
          </div>
          <div class="mt-auto flex flex-col gap-6 pb-2.5 pt-6 text-center text-xs text-gray-300">
            <UiButton
              variant="outline"
              class="sticky bottom-0 min-h-11 w-full border-[1.5px] border-blue-500 px-16 py-2 text-base font-medium leading-7 text-blue-500 hover:bg-blue-50"
              @click="handleSignOut"
            >
              <SignOutIcon class="mr-2 h-6 w-6" />
              Sign Out
            </UiButton>
            <p class="flex items-center justify-center gap-2 text-muted-foreground">
              <SvgoMenuHelp class="h-4 w-4 text-xs text-muted-foreground" />
              For assistance please contact
              <a href="mailto:support@demo.app" class="text-blue-500 hover:text-blue-400 hover:underline"> support@demo.app </a>
            </p>
          </div>
        </section>
      </div>
    </UiSheetContent>
  </UiSheet>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import XIcon from '@/assets/icons/x.svg';
import SignOutIcon from '@/assets/icons/menu/sign-out.svg';
import SvgoMenuHelp from '@/assets/icons/menu/help.svg';
import { useAuthStore } from '~/store/authStore';

const emit = defineEmits<{
  (e: 'close'): void;
}>();
const authStore = useAuthStore();
const { loggedInUser } = storeToRefs(authStore);
const isOpen = ref(true);
const closeButtonRef = ref<HTMLElement | null>(null);

const focusCloseButton = () => {
  const target = closeButtonRef.value;
  const element = target instanceof HTMLElement ? target : (target as { $el?: HTMLElement } | null)?.$el;
  element?.focus();
};

const handleOpenAutoFocus = (event: Event) => {
  event.preventDefault();
  nextTick(() => focusCloseButton());
};

const onOpenChange = (open: boolean) => {
  isOpen.value = open;

  if (!open) {
    emit('close');
  }
};

const handleSignedIn = () => {
  isOpen.value = false;
  emit('close');
};

const handleSignOut = async () => {
  authStore.signOut();
  setTimeout(() => {
    isOpen.value = false;
    emit('close');
  }, 200);
};
</script>
