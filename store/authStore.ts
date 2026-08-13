import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useCartStore } from '~/store/cartStore';
import { useNotificationStore } from '~/store/notificationStore';
import { userCards as fetchUserCards } from '~/composables/api/user';
import type { StripeCardInterface, UserInfoJWT } from '~/types';
import type { UserInterface } from '~/types/auth/user-interface';
import type { GeneralSettingsInterface } from '~/types/general-settings/general-settings';

export const useAuthStore = defineStore(
  'auth-store',
  () => {
    // Initial state
    const initialState = {
      token: '',
      loggedInUser: null as UserInfoJWT | null,
      userDetails: null as UserInterface | null,
      userCards: null as StripeCardInterface[] | null,
      generalSettings: null as GeneralSettingsInterface | null,
    };

    const tokenCookie = useCookie<string | null>('token', { maxAge: 60 * 60 });

    // Reactive state variables
    const token = computed<string>({
      get: () => tokenCookie.value ?? initialState.token,
      set: (value: string) => {
        tokenCookie.value = value || null;
      },
    });
    const loggedInUser = ref<UserInfoJWT | null>(initialState.loggedInUser);
    const userDetails = ref<UserInterface | null>(initialState.userDetails);
    const userCards = ref<StripeCardInterface[] | null>(initialState.userCards);
    const generalSettings = ref<GeneralSettingsInterface | null>(initialState.generalSettings);

    // Actions
    function addToken(tokenValue: string) {
      token.value = tokenValue;
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

      useNotificationStore().requestRefresh();

      return userCards.value as StripeCardInterface[];
    }

    function addGeneralSettings(settings: GeneralSettingsInterface) {
      generalSettings.value = settings;
    }

    function signOut() {
      loggedInUser.value = null;
      userDetails.value = null;
      userCards.value = null;
      token.value = '';
      generalSettings.value = null;

      useCartStore().emptyCart();
      useNotificationStore().clearOnSignOut();

      if (import.meta.client) {
        localStorage.removeItem('auth-store');
        // The persistence subscriber flushes after this action; remove its stale write too.
        queueMicrotask(() => localStorage.removeItem('auth-store'));
      }
    }

    function getToken() {
      return token.value || null;
    }

    // Getters
    const getCurrentUser = computed(() => loggedInUser.value);
    const getUserDetails = computed(() => userDetails.value as UserInterface);
    const getGeneralSettings = computed(() => generalSettings.value as GeneralSettingsInterface);

    // $reset function to reset state to initial values
    function $reset() {
      token.value = initialState.token;
      loggedInUser.value = initialState.loggedInUser;
      userDetails.value = initialState.userDetails;
      userCards.value = initialState.userCards;
      generalSettings.value = initialState.generalSettings;
    }

    return {
      // State
      token,
      loggedInUser,
      userDetails,
      userCards,
      generalSettings,

      // Actions
      addToken,
      addUser,
      addUserDetail,
      addUserCards,
      addGeneralSettings,
      signOut,
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
      pick: ['loggedInUser', 'userDetails', 'generalSettings'],
    },
  },
);
