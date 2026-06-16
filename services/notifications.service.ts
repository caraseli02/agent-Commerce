import type { Notification } from '~/types/dashboard/notification';
import HttpFactory from '~/composables/HttpFactory';

class NotificationsService extends HttpFactory {
  // private RESOURCE = '/user';
  private MAIN_RESOURCE = '/notification';

  async fetchGetNotifications() {
    return await this.call<Notification[]>('GET', `${this.MAIN_RESOURCE}`, null);
  }

  async fetchMarkNotificationAsRead(id: string) {
    return await this.call<unknown>('PUT', `${this.MAIN_RESOURCE}/${id}`, null);
  }

  async deleteNotificationById(id: string) {
    return await this.call<unknown>('DELETE', `${this.MAIN_RESOURCE}/${id}`, null);
  }
}

export default NotificationsService;
