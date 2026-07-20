import { useAuthStore } from '~~/store/authStore';
import { parseMockToken } from '~/utils/mockAuth';

export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('token');
  const authStore = useAuthStore();
  const config = useRuntimeConfig();

  const authToken = token?.value ? String(token.value) : '';
  const hasToken = Boolean(authToken);
  const redirectTarget = to.fullPath && to.fullPath !== '/' ? to.fullPath : '';
  const signinPath = redirectTarget ? `/?signin=true&redirect=${encodeURIComponent(redirectTarget)}` : '/?signin=true';

  if (!hasToken) {
    return navigateTo(signinPath, { replace: true, external: import.meta.client });
  }

  if (config.public.MOCK_MODE && !parseMockToken(authToken)) {
    if (import.meta.client) {
      authStore.signOut();
    }

    return navigateTo(signinPath, { replace: true });
  }
});
