import { useNuxtApp } from '#app';
import type { Notification } from '~~/types/dashboard/notification';

const RESOURCE = '/notification';

interface NotificationListResponse {
  status: string;
  description: Notification[];
}

interface NotificationActionResponse {
  status: string;
}

export async function fetchGetNotifications() {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<NotificationListResponse>(RESOURCE, {
    method: 'GET',
  });
}

export async function markNotificationAsRead(id: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<NotificationActionResponse>(`${RESOURCE}/${id}`, {
    method: 'PUT',
  });
}

export async function deleteNotificationById(id: string) {
  const { $apiClient } = useNuxtApp();

  return await $apiClient<NotificationActionResponse>(`${RESOURCE}/${id}`, {
    method: 'DELETE',
  });
}
