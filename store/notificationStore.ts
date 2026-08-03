import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotificationStore = defineStore('notification', () => {
  const showNotifications = ref(false);
  const unreadNotifications = ref(0);
  const refreshRequestId = ref(0);

  const requestRefresh = () => {
    refreshRequestId.value += 1;
  };

  const clearOnSignOut = () => {
    unreadNotifications.value = 0;
    showNotifications.value = false;
  };

  return {
    showNotifications,
    unreadNotifications,
    refreshRequestId,
    requestRefresh,
    clearOnSignOut,
  };
});
