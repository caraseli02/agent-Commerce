import { useAuthStore } from '~/store/authStore';
import HttpFactory from '~/composables/HttpFactory';

class DocumentService extends HttpFactory {
    private DOCUMENT_RESOURCE = '/document';

    private authStore = useAuthStore();

    async downloadDocument(id: string) {
        const token = this.authStore.getToken();

        const response = await this.call<Blob>('GET', `${this.DOCUMENT_RESOURCE}/${id}`, null, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
        });

        const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url); // Open the document in a new window

        return response;
    }
}

export default DocumentService;
