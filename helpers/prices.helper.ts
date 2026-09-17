import type { Ref } from 'vue';
import type { UserInterface } from '~/types/auth/user-interface';
import type { PriceConfigurationSettingsInterface, ProductDiscountsHelperInterface, ProductInterface } from '~/types/product';
import type { AddToCartRequestInterface, CartInterface, CartProductsInterface } from '~/types/cart';
import {
  calculateCartLinePricing,
  clampCartQuantity,
  resolveCustomerUnitPrice,
  resolveTierUnitPrice,
  type ClampCartQuantityOptions,
  type ClampCartQuantityResult,
} from '~/helpers/cart-pricing';

export {
  calculateCartLinePricing,
  clampCartQuantity,
  resolveCustomerUnitPrice,
  resolveTierUnitPrice,
  type ClampCartQuantityOptions,
  type ClampCartQuantityResult,
};

export const parseProductPriceConfiguration = (product: ProductInterface | null | undefined, userDetails: UserInterface, quantity = 0) => {
  let unitPrice = 0;

  if (!product?.priceConfiguration) {
    return null;
  }

  const minimumOrderQuantityConfiguration = product.priceConfiguration?.configuration[0] || null;
  let currentPriceConfiguration = minimumOrderQuantityConfiguration;

  if (quantity) {
    for (let i = product.priceConfiguration.configuration.length - 1; i >= 0; i--) {
      const configuration = product.priceConfiguration.configuration[i];
      if (configuration && quantity >= configuration.quantity) {
        unitPrice = configuration.price;
        currentPriceConfiguration = configuration;
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
  const currentConfigurationDiscountPrice = resolveCustomerUnitPrice(product, userDiscount, quantity);

  return {
    userDiscount: userDiscount,
    productDiscount: productDiscount,
    discountPrice: discountPrice,
    currentConfigurationDiscountPrice: currentConfigurationDiscountPrice,
    priceConfiguration: currentPriceConfiguration,
    minimumOrderQuantityConfiguration: minimumOrderQuantityConfiguration,
  } as unknown as ProductDiscountsHelperInterface;
};

export const resolveProductBrowsePricing = (product: ProductInterface | null | undefined, userDetails: UserInterface) => {
  const minimumQuantity = Number(product?.priceConfiguration?.configuration[0]?.quantity ?? 1);

  return parseProductPriceConfiguration(product, userDetails, minimumQuantity);
};

export const initializeQuantities = (
  product: ProductInterface,
  data: CartInterface | null | undefined,
  quantity: Ref<number>,
  initialRequestedQuantity: Ref<number>,
  _minPriceConfiguration: PriceConfigurationSettingsInterface,
) => {
  if (!data?.products?.length) {
    // Empty cart must clear any prior baseline so PDP shows enabled "Add to cart".
    initialRequestedQuantity.value = 0;
    return;
  }

  const cartProduct = data.products.find((item: CartProductsInterface) => item.id === product?._id);

  if (!cartProduct) {
    initialRequestedQuantity.value = 0;
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
  options?: { currentCartQuantity?: number; isDelta?: boolean },
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
    return { status: 'success', changed: false };
  }

  const unitPrice = resolveTierUnitPrice(product, clampedStock);
  const lineTotal = unitPrice * Math.abs(stockToSend);
  const { useCart } = await import('~/composables/useCart');
  const { addToCart } = useCart();
  const payload = {
    userId: '',
    products: [
      {
        id: product._id ?? '',
        stock: stockToSend,
        isFolder: false,
        initialUnitPrice: unitPrice,
        unitPriceAfterDiscounts: unitPrice,
        total: lineTotal,
        subtotal: lineTotal,
        discount: { value: 0, startDate: '', endDate: '' },
        productEntity: product,
      },
    ],
  } as AddToCartRequestInterface;

  return await addToCart(payload);
};
