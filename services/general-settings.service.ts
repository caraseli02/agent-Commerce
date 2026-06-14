import HttpFactory from '~/composables/HttpFactory';
import type { GeneralSettingsInterface } from '~/types/general-settings/general-settings';

class GeneralSettings extends HttpFactory {
    // private RESOURCE = '/user';
    private MAIN_RESOURCE = '/general-settings';

    async fetchSettings() {
        return await this.call<GeneralSettingsInterface>('GET', `${this.MAIN_RESOURCE}`, null);
    }
}

export default GeneralSettings;
