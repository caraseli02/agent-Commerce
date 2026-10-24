import { defineNuxtPlugin } from '#app';
import { useAuthStore } from '~/store/authStore';
import { fetchUserDetails } from '~/composables/api/auth';
import { resolveSessionUserId } from '~/utils/sessionUser';

// Client-only routes (the dashboards) never run the server plugin, and localStorage can be
// empty while the token cookie is still valid (new browser, cleared site data). Reload the
// user from the token then, so account details, addresses and credit render instead of placeholders.
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
    // Keep the guest view; route middleware still handles an invalid session.
  }
});
