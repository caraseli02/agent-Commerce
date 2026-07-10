<template>
  <div class="fixed z-[60] inset-0 w-screen h-screen pointer-events-none">
    <div
      class="relative z-10 flex flex-col ml-auto w-full h-full min-height bg-white max-h-vh pointer-events-auto md:w-[440px] px-2 py-4 overflow-y-scroll"
      :class="!loggedInUser ? 'px-4 py-6 md:p-6' : 'md:px-4 md:py-6'"
    >
      <div class="flex flex-col justify-between items-center pb-4 gap-4">
        <button
          aria-label="Close account panel"
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-light-300 p-0 leading-none transition-colors duration-300 hover:bg-light-400 self-end mr-2"
          @click="emit('close')"
        >
          <XIcon class="w-5 h-5 text-gray-600" />
        </button>
        <LayoutAccountModalDetails v-if="loggedInUser" />
      </div>
      <div v-if="!loggedInUser" class="flex-1 flex flex-col justify-between px-1">
        <section>
          <div class="text-neutral-70 font-semibold">Choose a demo role</div>
          <p class="text-xs leading-5 text-slate-500 mt-1 mb-6">
            Start with Customer Demo for the cleanest walkthrough, or open Admin Preview to inspect the back-office UI.
          </p>
          <LayoutAccountModalForm @signed-in="handleSignedIn" />
        </section>
        <p class="flex flex-wrap md:flex-nowrap justify-center items-center gap-2 text-slate-500 text-xs pt-6">
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
            class="sticky bottom-0 w-full justify-center items-center self-stretch flex flex-col px-16 py-2 rounded-lg border-[1.5px] border-solid border-blue-500"
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
  document.body.style.overflow = 'hidden';
  document.body.style.maxHeight = '100vh';
  documentUtil.toggleBodyScroll();
});

onBeforeUnmount(() => {
  documentUtil.toggleBodyScroll();
  document.body.style.overflow = 'auto';
  document.body.style.maxHeight = '100%';
});
</script>

<style scoped>
.min-height {
  min-height: 100vh;
  min-height: 100dvh;
}
</style>
