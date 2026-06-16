import HttpFactory from '@/composables/HttpFactory';
import type {
  FavouriteFolderMoveInterface,
  FavouriteFolderRequestInterface,
} from '~/model/favourite-folder/request/favourite-folder.interface';
import { useAuthStore } from '~/store/authStore';
import type { FavouriteFolderResponse } from '~/model/favourite-folder/response/favourite-folder.interface';

class FavouriteFolderService extends HttpFactory {
  private RESOURCE = '/user';
  private authStore = useAuthStore();

  async fetchFavouriteList() {
    const user = this.authStore.getCurrentUser;

    return await this.call<FavouriteFolderResponse>('GET', `${this.RESOURCE}/${user?.user_id}/favourite`, null);
  }

  async addEntityToFavouriteList(payload: FavouriteFolderRequestInterface) {
    const user = this.authStore.getCurrentUser;

    return await this.call<FavouriteFolderRequestInterface>('POST', `${this.RESOURCE}/${user?.user_id}/favourite`, payload);
  }

  async removeEntityFromFavouriteList(entityId: string) {
    const user = this.authStore.getCurrentUser;

    return await this.call<FavouriteFolderRequestInterface>('DELETE', `${this.RESOURCE}/${user?.user_id}/favourite/${entityId}`, null);
  }

  async copyEntityToFavouriteList(payload: FavouriteFolderMoveInterface) {
    const user = this.authStore.getCurrentUser;

    return await this.call<FavouriteFolderMoveInterface>('POST', `${this.RESOURCE}/${user?.user_id}/favourite/copy`, payload);
  }

  async moveEntityToFavouriteList(payload: FavouriteFolderMoveInterface) {
    const user = this.authStore.getCurrentUser;

    return await this.call<FavouriteFolderMoveInterface>('POST', `${this.RESOURCE}/${user?.user_id}/favourite/move`, payload);
  }
}

export default FavouriteFolderService;
