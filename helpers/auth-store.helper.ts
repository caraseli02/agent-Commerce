import { storeToRefs } from 'pinia';
import type { UserInterface } from '~/types/auth/user-interface';
import { useNuxtApp } from '#app';
import { useAuthStore } from '~/store/authStore';

export const updateStoreDetails = async () => {
    const { $api } = useNuxtApp();
    const authStore = useAuthStore();
    const { getUserDetails } = storeToRefs(authStore);
    const firebaseId = getUserDetails.value.firebaseId;
    if (!firebaseId) {
        return;
    }

    const response = await $api.auth.fetchUserDetails(firebaseId);

    if (response.status !== 'success') {
        return;
    }

    const userDetails = response.data;
    authStore.addUserDetail(userDetails as UserInterface);
};
