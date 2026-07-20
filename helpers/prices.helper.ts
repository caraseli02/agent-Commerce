import type { Ref } from 'vue';
import type { UserInterface } from '~/types/auth/user-interface';
import type {
  PriceConfigurationSettingsInterface,
  ProductDiscountsHelperInterface,
  ProductInterface,
} from '~/model/products/response/ProductResponse';
import type { AddToCartRequestInterface, CartInterface, CartProductsInterface } from '~/types/cart';
import {
  calculateCartLinePricing,
  clampCartQuantity,
  resolveTierUnitPrice,
  type ClampCartQuantityOptions,
  type ClampCartQuantityResult,
} from '~/helpers/cart-pricing';

export { calculateCartLinePricing, clampCartQuantity, resolveTierUnitPrice, type ClampCartQuantityOptions, type ClampCartQuantityResult };

export const parseProductPriceConfiguration = (product: ProductInterface, userDetails: UserInterface, quantity = 0) => {
  let unitPrice = 0;

  if (!product.priceConfiguration) {
    return null;
  }

  const minimumOrderQuantityConfiguration = product.priceConfiguration?.configuration[0] || null;
  let currentPriceConfiguration = minimumOrderQuantityConfiguration;

  if (quantity) {
    for (let i = product.priceConfiguration.configuration.length - 1; i >= 0; i--) {
      if (quantity >= product.priceConfiguration.configuration[i].quantity) {
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
  data: CartInterface | null | undefined,
  quantity: Ref<number>,
  initialRequestedQuantity: Ref<number>,
  _minPriceConfiguration: PriceConfigurationSettingsInterface
) => {
  if (!data?.products?.length) {
    return;
  }

  const cartProduct = data.products.find((item: CartProductsInterface) => item.id === product?._id);

  if (!cartProduct) {
    return;
  }

  // PDP quantity edits available stock only — never fold backorder into this control.
  const availableStock = Number(cartProduct.stock ?? 0);
  quantity.value = availableStock;
  initialRequestedQuantity.value = availableStock;
};

const showStockClampToast = async (maxStock: number, adjustedStock: number) => {
  const { toast } = await import('~/components/ui/toast');

  toast({
    title: 'Limited stock',
    description: `Only ${maxStock} items are available. Quantity was adjusted to ${adjustedStock}.`,
    variant: 'default',
  });
};

export const addToCartHelper = async (
  product: ProductInterface,
  stock: number,
  options?: { currentCartQuantity?: number; isDelta?: boolean }
) => {
  const currentCartQuantity = Math.max(0, Number(options?.currentCartQuantity ?? 0));
  const incomingDelta = Number(stock) || 0;
  const requestedQuantity = options?.isDelta ? currentCartQuantity + incomingDelta : incomingDelta;
  const { stock: clampedStock, wasClamped, maxStock } = clampCartQuantity(product, requestedQuantity);
  // Preserve negative deltas so reducing cart qty (e.g. 5 → 3) still hits the API.
  const stockToSend = options?.isDelta ? clampedStock - currentCartQuantity : clampedStock;

  if (wasClamped) {
    await showStockClampToast(maxStock, clampedStock);
  }

  if (stockToSend === 0) {
    return { status: 'success' };
  }

  const { useCart } = await import('~/composables/useCart');
  const { addToCart } = useCart();
  const payload = {
    userId: '',
    products: [
      {
        id: product._id ?? '',
        stock: stockToSend,
        isFolder: false,
      },
    ],
  } as AddToCartRequestInterface;

  return await addToCart(payload);
};
