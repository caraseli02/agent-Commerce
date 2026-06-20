import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import Emitter from 'tiny-emitter/instance.js';
import moment from 'moment';
import useFirebaseAuth from '~/composables/useFirebaseAuth';
import { useRouter, useRoute } from '#app';
import { userCards as fetchUserCards } from '~/composables/api/user';
import type { StripeCardInterface, UserInfoJWT } from '~/types';
import type { UserInterface } from '~/types/auth/user-interface';
import type { GeneralSettingsInterface } from '~/types/general-settings/general-settings';

export const useAuthStore = defineStore(
  'auth-store',
  () => {
    // Initial state
    const initialState = {
      token: { value: '', createdAt: '' },
      loggedInUser: null as UserInfoJWT | null,
      userDetails: null as UserInterface | null,
      firebaseTempToken: null as string | null,
      userCards: null as StripeCardInterface[] | null,
      generalSettings: null as GeneralSettingsInterface | null,
    };

    // Reactive state variables
    const token = reactive<{ value: string; createdAt: string }>({
      value: initialState.token.value,
      createdAt: initialState.token.createdAt,
    });
    const loggedInUser = ref<UserInfoJWT | null>(initialState.loggedInUser);
    const userDetails = ref<UserInterface | null>(initialState.userDetails);
    const firebaseTempToken = ref<string | null>(initialState.firebaseTempToken);
    const userCards = ref<StripeCardInterface[] | null>(initialState.userCards);
    const generalSettings = ref<GeneralSettingsInterface | null>(initialState.generalSettings);

    // Actions
    function addToken(tokenValue: string) {
      token.value = tokenValue;
      token.createdAt = new Date().toISOString();
    }

    function addUser(user: UserInfoJWT) {
      loggedInUser.value = user;
    }

    function addUserDetail(user: UserInterface) {
      userDetails.value = user;
    }

    async function addUserCards() {
      const cardsResponse = await fetchUserCards();

      if (!cardsResponse) {
        return null;
      }

      userCards.value = cardsResponse.data;

      Emitter.emit('update-cart', userCards.value);

      return userCards.value as StripeCardInterface[];
    }

    function addFirebaseToken(tokenValue: string) {
      firebaseTempToken.value = tokenValue;
    }

    function addGeneralSettings(settings: GeneralSettingsInterface) {
      generalSettings.value = settings;
    }

    function signOut() {
      loggedInUser.value = null;
      userDetails.value = null;
      token.value = '';
      token.createdAt = '';
      generalSettings.value = null;

      Emitter.emit('remove-cart-and-notifications', true);

      if (import.meta.client) {
        localStorage.clear();
      }
    }

    async function firebaseSignOut() {
      const firebaseAuth = useFirebaseAuth();
      await firebaseAuth.logout();

      loggedInUser.value = null;
      userDetails.value = null;
      token.value = '';
      token.createdAt = '';
      generalSettings.value = null;
    }

    function getToken() {
      const config = useRuntimeConfig();
      if (config.public.MOCK_MODE) {
        return token.value ? (token.value as unknown as UserInfoJWT) : null;
      }

      if (import.meta.server) return null;

      const router = useRouter();
      const route = useRoute();

      if (!token || !token.createdAt) {
        return null;
      }

      const time = moment().diff(moment(token.createdAt), 'minutes');

      if (time > 59) {
        signOut();

        if (route.path.includes('dashboard') || route.path.includes('order') || route.path.includes('checkout')) {
          router.push('/');
          Emitter.emit('open-account-modal');
        }

        return null;
      }

      return token.value as unknown as UserInfoJWT;
    }

    // Getters
    const getCurrentUser = computed(() => loggedInUser.value);
    const getUserDetails = computed(() => userDetails.value as UserInterface);
    const getGeneralSettings = computed(() => generalSettings.value as GeneralSettingsInterface);

    // $reset function to reset state to initial values
    function $reset() {
      token.value = initialState.token.value;
      token.createdAt = initialState.token.createdAt;
      loggedInUser.value = initialState.loggedInUser;
      userDetails.value = initialState.userDetails;
      firebaseTempToken.value = initialState.firebaseTempToken;
      userCards.value = initialState.userCards;
      generalSettings.value = initialState.generalSettings;
    }

    return {
      // State
      token,
      loggedInUser,
      userDetails,
      firebaseTempToken,
      userCards,
      generalSettings,

      // Actions
      addToken,
      addUser,
      addUserDetail,
      addUserCards,
      addFirebaseToken,
      addGeneralSettings,
      signOut,
      firebaseSignOut,
      getToken,

      // Getters
      getCurrentUser,
      getUserDetails,
      getGeneralSettings,

      // Reset function
      $reset,
    };
  },
  {
    persist: {
      storage: piniaPluginPersistedstate.localStorage(),
    },
  },
);
