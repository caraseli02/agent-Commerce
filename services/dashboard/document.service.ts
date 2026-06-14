import HttpFactory from '~/composables/HttpFactory';

class DocumentService extends HttpFactory {
    private DOCUMENT_RESOURCE = '/document';

    async downloadDocument(id: string) {
        const response = await this.call<Blob>('GET', `${this.DOCUMENT_RESOURCE}/${id}`, null, {
            responseType: 'blob',
        });

        const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url); // Open the document in a new window

        return response;
    }
}

export default DocumentService;
