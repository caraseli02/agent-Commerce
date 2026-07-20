import { useAuthStore } from '~~/store/authStore';
import { UserPermissionsEnum } from '~/types/auth/permissions';
import { getMockPermissionsByUserId, parseMockToken } from '~/utils/mockAuth';

const getRequiredPermission = (path: string) => {
  switch (true) {
    case path === '/dashboard/client':
      return UserPermissionsEnum.ClientDashboardRead;
    case path === '/dashboard/customers':
      return UserPermissionsEnum.AdminDashboardRead;
    case /^\/dashboard\/customers\/[^/]+\/control-panel\/[^/]+$/.test(path):
      return UserPermissionsEnum.AdminDashboardRead;
    case path === '/dashboard/orders':
      return UserPermissionsEnum.AdminDashboardRead;
    case /^\/dashboard\/orders\/[^/]+$/.test(path):
      return UserPermissionsEnum.AdminDashboardRead;
    case path === '/dashboard/settings':
      return UserPermissionsEnum.AdminDashboardRead;
    case /^\/dashboard\/settings\/[^/]+$/.test(path):
      return UserPermissionsEnum.AdminDashboardRead;
    case path === '/dashboard/products':
      return UserPermissionsEnum.AdminDashboardRead;
    case path === '/dashboard/products/categories':
      return UserPermissionsEnum.CategoriesRead;
    case path === '/product/categories':
      return UserPermissionsEnum.CategoriesRead;
    default:
      return null;
  }
};

export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig();
  const authStore = useAuthStore();
  const user = authStore.loggedInUser as { permissions?: UserPermissionsEnum[] } | null;
  const userDetails = authStore.userDetails as { permissions?: UserPermissionsEnum[] } | null;
  const token = useCookie('token');
  const requiredPermission = getRequiredPermission(to.path);
  const redirectTarget = to.fullPath && to.fullPath !== '/' ? to.fullPath : '';
  const signinPath = redirectTarget ? `/?signin=true&redirect=${encodeURIComponent(redirectTarget)}` : '/?signin=true';

  // Cookie expired/missing while Pinia still has a persisted account — clear before UI renders.
  if (!token.value && (authStore.loggedInUser || authStore.userDetails) && import.meta.client) {
    authStore.signOut();
  }

  if (to.path.startsWith('/dashboard') && !token.value) {
    if (import.meta.client) {
      authStore.signOut();
    }

    return navigateTo(signinPath, { replace: true, external: import.meta.client });
  }

  if (to.name !== 'signup' && authStore.firebaseTempToken != null) {
    authStore.firebaseTempToken = null;
  }

  if (!requiredPermission) {
    return;
  }

  let permissions = user?.permissions || userDetails?.permissions || [];

  if (!permissions.length && config.public.MOCK_MODE) {
    const parsedMockToken = parseMockToken(token.value ? String(token.value) : null);

    if (parsedMockToken) {
      permissions = getMockPermissionsByUserId(parsedMockToken.userId) || [];
    }
  }

  if (!permissions.length) {
    if (config.public.MOCK_MODE) {
      return navigateTo(signinPath, { replace: true });
    }

    return;
  }

  if (!permissions.includes(requiredPermission)) {
    return navigateTo('/');
  }
});
