import { useAuthStore } from '~/store/authStore';
import { UserPermissionsEnum } from '~~/types/auth/permissions';
import type { OperatorPermission } from '~~/types/inventory';
import { toast } from '~/components/ui/toast';
import { readCustomerAccountClaims, readSessionToken } from '~/utils/sessionToken';

const getRequiredOperatorPermission = (path: string): OperatorPermission | null => {
  if (path === '/dashboard/operator' || path.startsWith('/dashboard/operator/')) {
    return 'inventory:read';
  }

  return null;
};

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
  const requiredOperatorPermission = getRequiredOperatorPermission(to.path);
  const requiredPermission = getRequiredPermission(to.path);
  const redirectTarget = to.fullPath && to.fullPath !== '/' ? to.fullPath : '';
  const signinPath = redirectTarget ? `/?signin=true&redirect=${encodeURIComponent(redirectTarget)}` : '/?signin=true';

  if (requiredOperatorPermission) {
    const operatorPermissions = useState<OperatorPermission[]>('operator-permissions', () => []);
    const operatorPermissionsToken = useState<string | null>('operator-permissions-token', () => null);
    const rawToken = token.value ? String(token.value) : '';

    if (!rawToken) {
      operatorPermissions.value = [];
      operatorPermissionsToken.value = null;
      return navigateTo(signinPath);
    }

    if (!readCustomerAccountClaims(rawToken)) {
      operatorPermissions.value = [];
      operatorPermissionsToken.value = null;
      if (readSessionToken(rawToken)) {
        if (import.meta.client) {
          toast({ title: 'Access restricted', description: 'Your account cannot open that page, so we brought you back home.' });
        }
        return navigateTo('/');
      }
      return navigateTo(signinPath);
    }

    if (operatorPermissionsToken.value === rawToken && !operatorPermissions.value.includes(requiredOperatorPermission)) {
      if (import.meta.client) {
        toast({ title: 'Access restricted', description: 'Your account cannot open that page, so we brought you back home.' });
      }
      return navigateTo('/');
    }

    return;
  }

  if (!requiredPermission) {
    return;
  }

  let permissions = user?.permissions || userDetails?.permissions || [];

  if (!permissions.length && config.public.MOCK_MODE) {
    permissions = readSessionToken(token.value ? String(token.value) : null)?.permissions || [];
  }

  if (!permissions.length) {
    if (config.public.MOCK_MODE) {
      return navigateTo(signinPath);
    }

    return;
  }

  if (!permissions.includes(requiredPermission)) {
    if (import.meta.client) {
      toast({ title: 'Access restricted', description: 'Your account cannot open that page, so we brought you back home.' });
    }

    return navigateTo('/');
  }
});
