<template>
  <div class="fixed z-[60] inset-0 w-screen h-screen pointer-events-none">
    <div
      ref="panelRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      class="relative z-10 flex flex-col ml-auto w-full h-full min-height bg-white max-h-vh pointer-events-auto md:w-[440px] px-2 py-4 overflow-y-scroll"
      :class="!loggedInUser ? 'px-4 py-6 md:p-6' : 'md:px-4 md:py-6'"
    >
      <header class="sticky top-0 z-20 -mx-4 -mt-6 mb-4 flex items-center justify-between bg-white px-4 pt-6 pb-3 md:-mx-6 md:px-6">
        <h2 :id="titleId" class="text-lg font-semibold text-neutral-800">
          {{ loggedInUser ? 'Your account' : 'Sign in' }}
        </h2>
        <button
          ref="closeButtonRef"
          aria-label="Close account panel"
          class="flex h-11 w-11 items-center justify-center rounded-lg bg-light-300 transition-colors duration-300 hover:bg-light-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          @click="emit('close')"
        >
          <XIcon class="w-[24px] h-[24px] text-gray-600 hover:text-blue-500" />
        </button>
      </header>
      <div v-if="loggedInUser" class="pb-4">
        <LayoutAccountModalDetails v-if="loggedInUser" />
      </div>
      <div v-if="!loggedInUser" class="flex-1 flex flex-col px-1">
        <section>
          <p class="mb-4 text-xs leading-5 text-slate-500">Choose a demo role to continue. Passwords stay private unless you enter one.</p>
          <LayoutAccountModalForm @signed-in="handleSignedIn" />
        </section>
        <p class="mt-auto flex flex-wrap justify-center items-center gap-2 text-slate-500 text-xs pt-5">
          <SvgoMenuHelp class="text-slate-500 w-4 h-4 !text-xs" />
          For assistance please contact
          <a href="mailto:support@demo.app" class="text-blue-500 hover:text-blue-400 hover:underline"> support@demo.app </a>
        </p>
      </div>
      <section v-else class="flex flex-col justify-between h-full">
        <div class="flex-1 flex flex-col gap-6">
          <!-- <LayoutAccountModalMessage /> -->
          <LayoutAccountModalCredits class="mx-2" />
          <LayoutAccountModalLinks class="mx-2" @close="emit('close')" />
        </div>
        <div class="mx-2 text-xs text-gray-300 text-center mt-auto pb-2.5 pt-6 flex flex-col gap-6">
          <button
            type="button"
            class="sticky bottom-0 flex min-h-11 w-full flex-col items-center justify-center self-stretch rounded-lg border-[1.5px] border-solid border-blue-500 px-16 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            @click="handleSignOut"
          >
            <div class="flex items-center gap-2">
              <SignOutIcon class="w-6 h-6" />
              <div class="text-blue-500 text-base font-medium leading-7 self-stretch grow whitespace-nowrap">Sign Out</div>
            </div>
          </button>
          <p class="flex justify-center items-center gap-2 text-slate-500">
            <SvgoMenuHelp class="text-slate-500 w-4 h-4 text-xs" />
            For assistance please contact
            <a href="mailto:support@demo.app" class="text-blue-500 hover:text-blue-400 hover:underline"> support@demo.app </a>
          </p>
        </div>
      </section>
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
