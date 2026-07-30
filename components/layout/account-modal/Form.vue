<template>
  <form novalidate class="mx-auto" @submit.prevent="handleSignIn">
    <div>
      <p class="text-xs text-slate-500 mb-2">Demo role</p>
      <div role="radiogroup" aria-label="Demo role" class="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100">
        <UiButton
          type="button"
          variant="ghost"
          role="radio"
          :aria-checked="selectedLoginRole === 'customer'"
          :tabindex="selectedLoginRole === 'customer' ? 0 : -1"
          class="min-h-11 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="selectedLoginRole === 'customer' ? 'bg-white text-blue-500 shadow-sm hover:bg-white' : 'text-slate-500 hover:text-blue-500'"
          @click="selectDemoRole('customer')"
          @keydown="handleDemoRoleKeydown($event, 'customer')"
        >
          Customer Demo
        </UiButton>
        <UiButton
          type="button"
          variant="ghost"
          role="radio"
          :aria-checked="selectedLoginRole === 'admin'"
          :tabindex="selectedLoginRole === 'admin' ? 0 : -1"
          class="min-h-11 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          :class="selectedLoginRole === 'admin' ? 'bg-white text-blue-500 shadow-sm hover:bg-white' : 'text-slate-500 hover:text-blue-500'"
          @click="selectDemoRole('admin')"
          @keydown="handleDemoRoleKeydown($event, 'admin')"
        >
          Admin Preview
        </UiButton>
      </div>
    </div>
    <p class="mt-3 text-xs leading-5 text-slate-600">
      Demo passwords stay hidden. Customer Demo is ready to use; Admin Preview opens sample back-office data.
    </p>
    <div class="grid grid-cols-1 gap-3 mt-4">
      <FormInput
        v-model="email.value"
        size="lg"
        label="E-mail or client code"
        type="email"
        placeholder="you@company.com OR P-XXXXXX"
        :error="email.error"
      />
      <FormPassword v-model="password.value" size="lg" label="Password" :error="password.error" placeholder="Hidden for demo sign-in" />
    </div>
    <div class="mt-3 mb-5">
      <label class="flex min-h-11 cursor-pointer items-center gap-2" for="account-remember-me">
        <UiCheckbox id="account-remember-me" :checked="rememberMe" @update:checked="rememberMe = $event" />
        <span class="select-none text-xs text-slate-500"> Remember me </span>
      </label>
    </div>
    <UiButton type="submit" class="flex min-h-11 w-full items-center justify-center py-[10px]" :disabled="isLoading">
      <div v-if="isLoading" aria-label="Loading..." role="status" class="mr-3">
        <svg class="h-6 w-6 animate-spin" viewBox="3 3 18 18">
          <path
            class="fill-gray-200"
            d="M12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5ZM3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z"
          />
          <path
            class="fill-gray-800"
            d="M16.9497 7.05015C14.2161 4.31648 9.78392 4.31648 7.05025 7.05015C6.65973 7.44067 6.02656 7.44067 5.63604 7.05015C5.24551 6.65962 5.24551 6.02646 5.63604 5.63593C9.15076 2.12121 14.8492 2.12121 18.364 5.63593C18.7545 6.02646 18.7545 6.65962 18.364 7.05015C17.9734 7.44067 17.3403 7.44067 16.9497 7.05015Z"
          />
        </svg>
      </div>
      <SignINIcon v-else class="mr-2 h-6 w-6" />
      <span class="text-sm font-medium"> Sign In </span>
    </UiButton>
    <div v-if="errorResponse.show" role="alert" class="bg-rose-600 p-2 mt-3 rounded">
      <p class="text-white">
        {{ errorResponse.description }}
      </p>
    </div>
    <div v-if="!config.public.MOCK_MODE" class="flex items-center mt-12 mb-6">
      <div class="h-px flex-1 bg-gray-100" />
      <span class="text-xs text-gray-400 flex-shrink-0 mx-[18px]"> Or continue with </span>
      <div class="h-px flex-1 bg-gray-100" />
    </div>
    <UiButton
      v-if="!config.public.MOCK_MODE"
      type="button"
      variant="outline"
      class="group mb-5 w-full border-border py-2 transition-colors duration-300 hover:border-blue-500"
      @click="loginWithGoogle"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-6 h-6 mr-2 transition-all duration-300">
        <g clip-path="url(#clip0_154_2471)">
          <path
            fill="#4285F4"
            d="M21.788 12.225c0-.659-.058-1.284-.158-1.892h-9.417v3.758h5.392c-.242 1.234-.95 2.275-2 2.984v2.5h3.216c1.884-1.742 2.967-4.309 2.967-7.35Z"
          />
          <path
            fill="#34A853"
            d="M12.212 22c2.7 0 4.958-.9 6.608-2.425l-3.216-2.5c-.9.6-2.042.966-3.392.966-2.608 0-4.817-1.758-5.608-4.133H3.287v2.575C4.93 19.75 8.304 22 12.212 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.605 13.908A5.803 5.803 0 0 1 6.288 12c0-.667.117-1.308.317-1.908V7.517H3.288a9.884 9.884 0 0 0 0 8.966l3.317-2.575Z"
          />
          <path
            fill="#EA4335"
            d="M12.212 5.958c1.475 0 2.792.509 3.833 1.5l2.85-2.85C17.17 2.992 14.912 2 12.212 2 8.304 2 4.93 4.25 3.287 7.517l3.317 2.575c.791-2.375 3-4.134 5.608-4.134Z"
          />
        </g>
        <defs>
          <clipPath id="clip0_154_2471">
            <path fill="#fff" d="M2 2h20v20H2z" />
          </clipPath>
        </defs>
      </svg>
      <span class="text-sm font-medium text-slate-500">Google</span>
    </UiButton>
  </form>
</template>

<script setup lang="ts">
import Emitter from 'tiny-emitter/instance.js';
import SignINIcon from '@/assets/icons/menu/in.svg';
import { AccountRole, type SigninResponse, type UserInfoJWT } from '~~/types';
import type { UserPermissionsEnum } from '~/types/auth/permissions';
import { useAuthStore } from '~~/store/authStore';
import type { UserInterface } from '~/types/auth/user-interface';
import { useCartStore } from '~/store/cartStore';
import { usePricingStore } from '~/store/pricingStore';
import { fetchUserDetails as fetchAuthUserDetails, login as authLogin } from '~/composables/api/auth';
import { fetchSettings as fetchGeneralSettings } from '~/composables/api/settings';

const { checkForInputErrors } = useFormValidation();
const config = useRuntimeConfig();
const route = useRoute();
const cartStore = useCartStore();
const pricingStore = usePricingStore();
const emits = defineEmits<{
  (e: 'signed-in'): void;
}>();

const email = ref({
  value: '',
  error: '',
  type: 'email',
});
const password = ref({
  value: '',
  error: '',
});

const rememberMe = ref(false);
const isLoading = ref(false);
type LoginRole = 'customer' | 'admin';
const selectedLoginRole = ref<LoginRole>('customer');

const selectDemoRole = (role: LoginRole) => {
  selectedLoginRole.value = role;
};

const focusSelectedDemoRole = (radiogroup: Element | null) => {
  radiogroup?.querySelector<HTMLButtonElement>('[role="radio"][aria-checked="true"]')?.focus();
};

const handleDemoRoleKeydown = (event: KeyboardEvent, role: LoginRole) => {
  if (event.key === ' ') {
    event.preventDefault();
    selectDemoRole(role);
    return;
  }

  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    return;
  }

  event.preventDefault();
  selectDemoRole(role === 'customer' ? 'admin' : 'customer');
  nextTick(() => focusSelectedDemoRole((event.currentTarget as HTMLElement).closest('[role="radiogroup"]')));
};

const LOGIN_CREDENTIALS: Record<LoginRole, { email: string; password: string }> = {
  customer: {
    email: 'customer@demo.com',
    password: 'customer123',
  },
  admin: {
    email: 'admin@demo.com',
    password: 'admin123',
  },
};

const errorResponse = reactive({
  show: false,
  status: '',
  description: '',
  code: 0,
});

const authStore = useAuthStore();
const { registerUser, getParsedFirebaseJWTToken, getUserToken } = useFirebaseAuth();

const setDemoCredentialsByRole = (role: LoginRole) => {
  email.value.value = LOGIN_CREDENTIALS[role].email;
  password.value.value = '';
  email.value.error = '';
  password.value.error = '';
};

watch(
  selectedLoginRole,
  (role) => {
    setDemoCredentialsByRole(role);
  },
  { immediate: true }
);

const isClientCodeFormat = (value: string) => {
  const regex = /^[PBAS]-\d{6}$/;
  return regex.test(value);
};

const resolvePasswordForSignin = () => password.value.value || LOGIN_CREDENTIALS[selectedLoginRole.value].password;

const normalizeSigninResponse = (response: SigninResponse | null | undefined) => {
  const token = response?.token || response?.data?.token;
  const user = response?.user || response?.data?.user;

  return { token, user };
};

const buildTokenPayloadFromMockUser = (user: UserInterface): UserInfoJWT => {
  const now = Math.floor(Date.now() / 1000);
  const userWithPermissions = user as UserInterface & { permissions?: unknown[] };
  const safeUserId = user._id || 'mock-user-1';
  const safeEmail = user.contactDetails?.email || LOGIN_CREDENTIALS[selectedLoginRole.value].email;

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

const getRoleRedirectPath = (role?: AccountRole) => {
  if (role === AccountRole.Admin || role === AccountRole.SuperAdmin) {
    return '/dashboard/orders';
  }

  return '/dashboard/client?tab=home';
};

const getSafeRedirectFromQuery = () => {
  const redirectParam = typeof route.query.redirect === 'string' ? route.query.redirect : '';

  if (!redirectParam) {
    return '';
  }

  // Allow only in-app absolute paths and block protocol-relative redirects.
  if (!redirectParam.startsWith('/') || redirectParam.startsWith('//')) {
    return '';
  }

  return redirectParam;
};

const handleSignIn = async () => {
  if (isLoading.value) {
    return;
  }

  errorResponse.show = false;
  errorResponse.description = '';
  errorResponse.status = '';
  errorResponse.code = 0;

  const passwordForSignin = resolvePasswordForSignin();
  const passwordForValidation = {
    ...password.value,
    value: passwordForSignin,
  };
  const hasError = checkForInputErrors([email.value, passwordForValidation]);

  if (hasError) {
    password.value.error = passwordForValidation.error;
    return;
  }

  const payload = {
    password: passwordForSignin,
  } as { password: string; email?: string; clientCode?: string };

  if (isClientCodeFormat(email.value.value)) {
    payload['clientCode'] = email.value.value;
  } else {
    payload['email'] = email.value.value;
  }

  isLoading.value = true;
  const safeRedirect = getSafeRedirectFromQuery();

  try {
    const response = (await authLogin(payload)) as unknown as SigninResponse;
    const { token, user } = normalizeSigninResponse(response);

    if (!token) {
      throw response;
    }

    const parsedTokenResponse =
      config.public.MOCK_MODE && user ? buildTokenPayloadFromMockUser(user) : (useParser().parseJwt(token) as UserInfoJWT);

    authStore.addUser(parsedTokenResponse);
    authStore.addToken(token);

    const userDetails = await fetchUserDetails(parsedTokenResponse.user_id || user?._id, user, token);
    if (!userDetails) {
      throw new Error('Failed to resolve user details');
    }

    emits('signed-in');
    await navigateTo(safeRedirect || getRoleRedirectPath(userDetails.role));
  } catch (error: unknown) {
    const apiError = error as { response?: { status?: number }; statusCode?: number };
    const statusCode = apiError.response?.status || apiError.statusCode || 500;
    errorResponse.code = statusCode;
    errorResponse.status = statusCode === 401 ? 'Invalid credentials' : 'Sign-in failed';
    errorResponse.description =
      statusCode === 401
        ? 'Invalid email/client code or password. Please check your credentials and try again.'
        : 'Unable to sign in right now. Please try again.';
    errorResponse.show = true;
  } finally {
    isLoading.value = false;
  }
};

const fetchUserDetails = async (userId?: string, fallbackUser?: UserInterface, token?: string) => {
  let userDetails = fallbackUser || null;

  if (userId) {
    try {
      const detailsResponse = await fetchAuthUserDetails(userId, token);

      if (detailsResponse.status === 'success') {
        userDetails = detailsResponse.data as UserInterface;
      }
    } catch (error) {
      console.error(error);
    }
  }

  if (!userDetails) {
    errorResponse.show = true;
    errorResponse.description = 'Unable to load user details.';
    return null;
  }

  await authStore.addUserDetail(userDetails as UserInterface);

  if (userDetails) {
    try {
      const response = await fetchGeneralSettings();
      if (response.status === 'success') {
        authStore.addGeneralSettings(response.data);
      }
    } catch (error) {
      console.error(error);
    }
  }

  await Promise.allSettled([cartStore.updateAndReturnCart(), authStore.addUserCards(), pricingStore.updateAndReturnPricing()]);

  Emitter.emit('notifications', true);
  return userDetails as UserInterface;
};

const loginWithGoogle = async () => {
  await registerUser();
  const parsedToken = await getParsedFirebaseJWTToken();
  const token = (await getUserToken()) as unknown as string;
  authStore.addToken(token);
  authStore.addUser(parsedToken);

  // eslint-disable-next-line no-prototype-builtins
  if (!parsedToken.hasOwnProperty('permissions')) {
    authStore.addFirebaseToken(token);
    return navigateTo('/');
  } else {
    await fetchUserDetails(parsedToken.user_id);
  }
};
</script>
