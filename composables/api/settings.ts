import { useNuxtApp } from '#app';
import type { GeneralSettingsInterface } from '~/types/general-settings/general-settings';

export interface GeneralSettingsResponse {
    data: GeneralSettingsInterface;
    status: string;
}

export async function fetchSettings() {
    const { $apiClient } = useNuxtApp();

    return await $apiClient<GeneralSettingsResponse>('/general-settings', {
        method: 'GET',
    });
}
