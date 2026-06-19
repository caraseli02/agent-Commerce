import Emitter from 'tiny-emitter/instance.js';
import HttpFactory from '@/composables/HttpFactory';
import { useAuthStore } from '~/store/authStore';
import type {
  AddToCartRequestInterface,
  DeleteProductCartRequestInterface,
  UpdateProductCartRequestInterface,
} from '~/model/cart/request/cart.interface';
import type { CartProductsInterface, CartResponse } from '~/model/cart/response/cart.interface';

class CartService extends HttpFactory {
  private RESOURCE = '/cart';
  private authStore = useAuthStore();

  private router = useRouter();

  async fetchCartList() {
    return await this.call<CartResponse>('GET', `${this.RESOURCE}`, null);
  }

  async addEntityToCart(payload: AddToCartRequestInterface) {
    const user = this.authStore.getCurrentUser;
    const token = this.authStore.getToken();
    const config = useRuntimeConfig();

    if (!token && !config.public.MOCK_MODE) {
      await this.router.push('/');
      Emitter.emit('open-account-modal');
    }

    if (user) {
      payload.userId = user.user_id;
    }

    return await this.call('POST', `${this.RESOURCE}`, payload);
  }

  async removeEntityFromCart(payload: DeleteProductCartRequestInterface) {
    return await this.call('DELETE', `${this.RESOURCE}`, payload);
  }

  async updateEntityFromCart(payload: UpdateProductCartRequestInterface) {
    const user = this.authStore.getCurrentUser;
    const token = this.authStore.getToken();
    const config = useRuntimeConfig();

    if (!token && !config.public.MOCK_MODE) {
      await this.router.push('/');
      Emitter.emit('open-account-modal');
    }

    if (user) {
      payload.userId = user.user_id;
    }

    return await this.call('PUT', `${this.RESOURCE}`, payload);
  }

  async fetchCartProducts() {
    return await this.call<CartProductsInterface>('GET', `${this.RESOURCE}`, null);
  }
}

export default CartService;
