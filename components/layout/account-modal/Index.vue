<template>
  <div class="fixed z-[60] inset-0 w-screen h-screen pointer-events-none">
    <div
      ref="panelRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      class="relative z-10 flex flex-col ml-auto w-full h-full min-height bg-white max-h-vh pointer-events-auto overflow-y-auto md:w-[440px]"
    >
      <header
        class="sticky top-0 z-20 flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 md:px-6"
      >
        <h2 :id="titleId" class="truncate text-lg font-semibold text-neutral-800">
          {{ loggedInUser ? 'Your account' : 'Sign in' }}
        </h2>
        <button
          ref="closeButtonRef"
          type="button"
          aria-label="Close account panel"
          class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-light-300 transition-colors duration-300 hover:bg-light-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          @click="emit('close')"
        >
          <XIcon class="h-5 w-5 text-gray-600 hover:text-blue-500" />
        </button>
      </header>

      <div class="flex flex-1 flex-col px-4 py-4 md:px-6 md:py-5">
        <div v-if="loggedInUser" class="pb-4">
          <LayoutAccountModalDetails />
        </div>
        <div v-if="!loggedInUser" class="flex flex-1 flex-col">
          <section>
            <p class="mb-4 text-xs leading-5 text-slate-500">
              Choose a demo role to continue. Passwords stay private unless you enter one.
            </p>
            <LayoutAccountModalForm @signed-in="handleSignedIn" />
          </section>
          <p class="mt-auto flex flex-wrap items-center justify-center gap-2 pt-5 text-xs text-slate-500">
            <SvgoMenuHelp class="h-4 w-4 !text-xs text-slate-500" />
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
            <button
              type="button"
              class="sticky bottom-0 flex min-h-11 w-full flex-col items-center justify-center self-stretch rounded-lg border-[1.5px] border-solid border-blue-500 px-16 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              @click="handleSignOut"
            >
              <div class="flex items-center gap-2">
                <SignOutIcon class="h-6 w-6" />
                <div class="grow self-stretch whitespace-nowrap text-base font-medium leading-7 text-blue-500">Sign Out</div>
              </div>
            </button>
            <p class="flex items-center justify-center gap-2 text-slate-500">
              <SvgoMenuHelp class="h-4 w-4 text-xs text-slate-500" />
              For assistance please contact
              <a href="mailto:support@demo.app" class="text-blue-500 hover:text-blue-400 hover:underline"> support@demo.app </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import XIcon from '@/assets/icons/x.svg';
import SignOutIcon from '@/assets/icons/menu/sign-out.svg';
import SvgoMenuHelp from '@/assets/icons/menu/help.svg';
import { useAuthStore } from '~~/store/authStore';

const emit = defineEmits<{
  (e: 'close'): void;
}>();
const authStore = useAuthStore();
const { loggedInUser } = storeToRefs(authStore);
const panelRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
const previouslyFocusedElement = ref<HTMLElement | null>(null);
const titleId = useId();

const getFocusableElements = () => {
  return Array.from(
    panelRef.value?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) || []
  );
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
    return;
  }

  if (event.key !== 'Tab') {
    return;
  }

  const focusableElements = getFocusableElements();
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (!firstElement || !lastElement) {
    return;
  }

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
};

const handleSignedIn = () => {
  emit('close');
};

const handleSignOut = async () => {
  authStore.signOut();
  await authStore.firebaseSignOut();
  setTimeout(() => {
    emit('close');
  }, 200);
};

onMounted(() => {
  previouslyFocusedElement.value = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.body.style.overflow = 'hidden';
  document.body.style.maxHeight = '100vh';
  documentUtil.toggleBodyScroll();
  document.addEventListener('keydown', handleKeydown);
  nextTick(() => closeButtonRef.value?.focus());
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  documentUtil.toggleBodyScroll();
  document.body.style.overflow = 'auto';
  document.body.style.maxHeight = '100%';
  previouslyFocusedElement.value?.focus();
});
</script>

<style scoped>
.min-height {
  min-height: 100vh;
  min-height: 100dvh;
}
</style>
