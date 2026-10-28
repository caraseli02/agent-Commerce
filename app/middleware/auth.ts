import { useAuthStore } from '~/store/authStore';
import { readSessionToken } from '~/utils/sessionToken';
import { requiresDemoToken } from '~~/helpers/mock-integration';

export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('token');
  const authStore = useAuthStore();
  const config = useRuntimeConfig();

  const authToken = token?.value ? String(token.value) : '';
  const hasToken = Boolean(authToken);
  const redirectTarget = to.fullPath && to.fullPath !== '/' ? to.fullPath : '';
  const signinPath = redirectTarget ? `/?signin=true&redirect=${encodeURIComponent(redirectTarget)}` : '/?signin=true';

  if (!hasToken) {
    if (import.meta.client) {
      authStore.signOut();
    }

    return navigateTo(signinPath);
  }

  if (requiresDemoToken(Boolean(config.public.MOCK_MODE)) && !readSessionToken(authToken)) {
    if (import.meta.client) {
      authStore.signOut();
    }

    return navigateTo(signinPath);
  }
});
