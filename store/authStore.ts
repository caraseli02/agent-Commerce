import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import Emitter from 'tiny-emitter/instance.js';
import useFirebaseAuth from '~/composables/useFirebaseAuth';
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
      firebaseTempToken: null as string | null,
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
    const firebaseTempToken = ref<string | null>(initialState.firebaseTempToken);
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
      generalSettings.value = null;

      Emitter.emit('remove-cart-and-notifications', true);

      if (import.meta.client) {
        localStorage.removeItem('auth-store');
      }
    }

    async function firebaseSignOut() {
      const firebaseAuth = useFirebaseAuth();
      await firebaseAuth.logout();

      loggedInUser.value = null;
      userDetails.value = null;
      token.value = '';
      generalSettings.value = null;
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
      pick: ['loggedInUser', 'userDetails', 'firebaseTempToken', 'userCards', 'generalSettings'],
    },
  }
);
