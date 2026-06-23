import { useNuxtApp } from '#app';

const DOCUMENT_RESOURCE = '/document';

export async function downloadDocument(id: string) {
  const { $apiClient } = useNuxtApp();

  const response = await $apiClient<Blob, 'blob'>(`${DOCUMENT_RESOURCE}/${id}`, {
    method: 'GET',
    responseType: 'blob',
  });

  const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  window.open(url);

  return response;
}
