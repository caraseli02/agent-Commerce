import { onMounted, ref } from 'vue';

/**
 * Returns false during SSR and the initial client render, then true after mount.
 * Use to gate UI that depends on client-only state (for example persisted Pinia stores).
 */
export function useClientReady() {
  const isClientReady = ref(false);

  onMounted(() => {
    isClientReady.value = true;
  });

  return isClientReady;
}
