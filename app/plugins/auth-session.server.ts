import { defineNuxtPlugin } from '#app';
import { useAuthStore } from '~/store/authStore';
import { fetchUserDetails } from '~/composables/api/auth';
import { resolveSessionUserId } from '~/utils/sessionUser';

// The client restores userDetails from localStorage, which SSR cannot read. Load them here
// from the token cookie so signed-in pages render customer pricing on both sides of hydration.
export default defineNuxtPlugin(async (nuxtApp) => {
  const authStore = useAuthStore();
  const token = authStore.getToken();
  if (!token || authStore.userDetails) return;

  const userId = resolveSessionUserId(token, Boolean(nuxtApp.$config.public.MOCK_MODE));
  if (!userId) return;

  try {
    const response = await fetchUserDetails(userId, token);
    if (response.status === 'success' && response.data) {
      authStore.addUserDetail(response.data);
    }
  } catch {
    // Render with guest pricing; the client keeps its existing session handling.
  }
});
