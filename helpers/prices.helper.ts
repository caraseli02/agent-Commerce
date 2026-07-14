import type { Ref } from 'vue';
import type { UserInterface } from '~/types/auth/user-interface';
import type {
  PriceConfigurationSettingsInterface,
  ProductDiscountsHelperInterface,
  ProductInterface,
} from '~/model/products/response/ProductResponse';
import type { CartInterface, CartProductsInterface } from '~/types/cart';
import type { AddToCartRequestInterface } from '~/types/cart';

export const parseProductPriceConfiguration = (product: ProductInterface, userDetails: UserInterface, quantity = 0) => {
  let unitPrice = 0;

  if (!product.priceConfiguration) {
    return null;
  }

  const minimumOrderQuantityConfiguration = product.priceConfiguration?.configuration[0] || null;
  let currentPriceConfiguration = minimumOrderQuantityConfiguration;

  if (quantity) {
    for (let i = product.priceConfiguration.configuration.length - 1; i >= 0; i--) {
      if (quantity > product.priceConfiguration.configuration[i].quantity) {
        unitPrice = product.priceConfiguration.configuration[i].price;
        currentPriceConfiguration = product.priceConfiguration.configuration[i];
        break;
      }
    }
  } else {
    unitPrice = minimumOrderQuantityConfiguration?.price || 0;
    currentPriceConfiguration = minimumOrderQuantityConfiguration;
  }

  const userDiscount = userDetails?.adminSettings?.discount?.value || 0;
  const productDiscount = product.adminSettings?.discount?.value || 0;
  let discountPrice = 0;

  discountPrice = productDiscount ? unitPrice * (1 - productDiscount / 100) : unitPrice * (1 - userDiscount / 100);
  const currentConfigurationDiscountPrice = productDiscount
    ? currentPriceConfiguration?.price * (1 - productDiscount / 100)
    : currentPriceConfiguration?.price * (1 - userDiscount / 100);

  return {
    userDiscount: userDiscount,
    productDiscount: productDiscount,
    discountPrice: discountPrice,
    currentConfigurationDiscountPrice: currentConfigurationDiscountPrice,
    priceConfiguration: currentPriceConfiguration,
    minimumOrderQuantityConfiguration: minimumOrderQuantityConfiguration,
  } as unknown as ProductDiscountsHelperInterface;
};

export const initializeQuantities = (
  product: ProductInterface,
  data: CartInterface,
  quantity: Ref<number>,
  initialRequestedQuantity: Ref<number>,
  minPriceConfiguration: PriceConfigurationSettingsInterface
) => {
  if (!data.products?.length) {
    return;
  }

  const cartProduct = data.products.find((item: CartProductsInterface) => item.id === product?._id);
  const cartProductQuantity = (cartProduct?.stock ?? 0) + (cartProduct?.backorder_stock ?? 0);

  quantity.value = cartProduct && cartProductQuantity > 0 ? cartProductQuantity : minPriceConfiguration?.quantity || 0;
  initialRequestedQuantity.value = cartProduct && cartProductQuantity > 0 ? cartProductQuantity : 0;
};

export const addToCartHelper = async (product: ProductInterface, stock: number) => {
  const { useCart } = await import('~/composables/useCart');
  const { addToCart } = useCart();
  const payload = {
    userId: '',
    products: [
      {
        id: product._id ?? '',
        stock,
        isFolder: false,
      },
    ],
  } as AddToCartRequestInterface;

  return await addToCart(payload);
};
