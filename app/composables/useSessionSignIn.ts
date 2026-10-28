import { useAuthStore } from '~/store/authStore';
import { useCartStore } from '~/store/cartStore';
import { useNotificationStore } from '~/store/notificationStore';
import { usePricingStore } from '~/store/pricingStore';
import { fetchUserDetails } from '~/composables/api/auth';
import { fetchSettings as fetchGeneralSettings } from '~/composables/api/settings';
import type { UserInfoJWT } from '~~/types';
import type { UserPermissionsEnum } from '~~/types/auth/permissions';
import type { UserInterface } from '~~/types/auth/user-interface';

const buildTokenPayloadFromUser = (user: UserInterface): UserInfoJWT => {
  const now = Math.floor(Date.now() / 1000);
  const userWithPermissions = user as UserInterface & { permissions?: unknown[] };
  const safeUserId = user._id || 'mock-user-1';
  const safeEmail = user.contactDetails?.email || '';

  return {
    aud: 'mock-aud',
    auth_time: now,
    email: safeEmail,
    email_verified: true,
    exp: now + 60 * 60,
    firebase: {
      identities: {
        email: [safeEmail],
        'google.com': [safeEmail],
      },
      sign_in_provider: 'password',
    },
    iat: now,
    iss: 'mock-issuer',
    name: `${user.contactDetails?.firstName || 'Demo'} ${user.contactDetails?.lastName || 'User'}`.trim(),
    picture: 'https://ui-avatars.com/api/?name=Demo+User',
    sub: safeUserId,
    user_id: safeUserId,
    permissions: (userWithPermissions.permissions || []) as UserPermissionsEnum[],
  };
};

/** Stores a fresh session (sign-in or signup) and loads what signed-in pages need. Null when details cannot be loaded. */
export function useSessionSignIn() {
  const config = useRuntimeConfig();
  const authStore = useAuthStore();
  const cartStore = useCartStore();
  const pricingStore = usePricingStore();

  const startSession = async (token: string, user?: UserInterface): Promise<UserInterface | null> => {
    const tokenPayload = config.public.MOCK_MODE && user ? buildTokenPayloadFromUser(user) : (useParser().parseJwt(token) as UserInfoJWT);

    authStore.addUser(tokenPayload);
    authStore.addToken(token);

    let userDetails = user || null;
    const userId = tokenPayload.user_id || user?._id;
    if (userId) {
      try {
        const detailsResponse = await fetchUserDetails(userId, token);
        if (detailsResponse.status === 'success') userDetails = detailsResponse.data as UserInterface;
      } catch (error) {
        console.error(error);
      }
    }

    if (!userDetails) return null;
    authStore.addUserDetail(userDetails);

    try {
      const response = await fetchGeneralSettings();
      if (response.status === 'success') authStore.addGeneralSettings(response.data);
    } catch (error) {
      console.error(error);
    }

    await Promise.allSettled([cartStore.updateAndReturnCart(), authStore.addUserCards(), pricingStore.updateAndReturnPricing()]);
    useNotificationStore().requestRefresh();
    return userDetails;
  };

  return { startSession };
}
