import { storeToRefs } from 'pinia';
import type { UserInterface } from '~~/types/auth/user-interface';
import { useAuthStore } from '~/store/authStore';
import { fetchUserDetails } from '~/composables/api/auth';

export const updateStoreDetails = async () => {
  const authStore = useAuthStore();
  const { getUserDetails } = storeToRefs(authStore);
  const firebaseId = getUserDetails.value.firebaseId;
  if (!firebaseId) {
    return;
  }

  const response = await fetchUserDetails(firebaseId);

  if (response.status !== 'success') {
    return;
  }

  const userDetails = response.data;
  authStore.addUserDetail(userDetails as UserInterface);
};
