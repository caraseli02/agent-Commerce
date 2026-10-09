import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { format } from 'date-fns';
import { useAuthStore } from '~/store/authStore';
import {
  fetchCustomerActiveOrders,
  fetchFavorites,
  fetchMonthHotSale,
  fetchRecentlyBought,
  fetchReturns,
  fetchTotalOrders,
  fetchViewHistory,
} from '~/composables/api/customer-dashboard';
import type {
  CustomerDashboardActivityData,
  ProductBannerInterface,
  ViewHistoryProductInterface,
} from '~~/types/dashboard/client-dashboard';
import type { BillingAddressInterface, ShippingAddressInterface, UserInterface } from '~~/types/auth/user-interface';
import type { ProductInterface } from '~~/types/product';
import { AccountType } from '~~/types';
import type { StripeCardInterface } from '~~/types';
import { resolveProductBrowsePricing } from '~~/helpers/prices.helper';
import { useRegionalPreferencesStore } from '~/store/regionalPreferencesStore';

interface OrderIdItem {
  shortId: string;
  id: string;
}

interface TabFilter {
  label?: string;
  value: string;
  total_items?: number;
}

const ordersIds = ref<OrderIdItem[]>([]);
const activeOrderFilter = ref<TabFilter>({
  value: 'home',
});
const emptyActivityData = (): CustomerDashboardActivityData => ({
  favorites: { products: 0, folders: 0 },
  monthOrder: 0,
  returns: 0,
  totalOrders: 0,
});

const myActivityData = ref<CustomerDashboardActivityData>(emptyActivityData());
const myAccountInformation = ref<UserInterface>({} as UserInterface);
const myRecentlyBougth = ref<ProductInterface[]>([]);
const myAddresses = ref<ShippingAddressInterface[]>([]);
const myViewHistory = ref<ProductInterface[]>([]);
const myMonthHotSale = ref<ProductInterface[]>([]);
const hotSales = ref<ProductBannerInterface[]>([]);
const myCard = ref<StripeCardInterface | null>(null);

export const useCustomerDashboard = () => {
  const authStore = useAuthStore();
  const { getUserDetails, userDetails } = storeToRefs(authStore);

  const activeOrders = async () => {
    const { data, status } = await fetchCustomerActiveOrders();
    if (status && data && data.total) {
      ordersIds.value = data.total.map((object) => {
        return { shortId: object.shortId, id: object._id };
      });
    }
  };

  const activityWidgets = async () => {
    myActivityData.value = emptyActivityData();
    const favorites = await fetchFavorites();
    const totalOrders = await fetchTotalOrders();
    const returns = await fetchReturns();

    if (favorites.status === 'success') {
      myActivityData.value.favorites = {
        products: favorites.data.products_number || 0,
        folders: favorites.data.folders_number || 0,
      };
    }
    if (totalOrders.status === 'success') {
      myActivityData.value.totalOrders = totalOrders.data.total_orders || 0;
      myActivityData.value.monthOrder = totalOrders.data.total_orders_current_month || 0;
    }

    if (returns.status === 'success') {
      myActivityData.value.returns = returns.data.total || 0;
    }
  };

  const customerInformation = async () => {
    if (userDetails.value) {
      myAccountInformation.value = userDetails.value;
    }
  };

  const recentlyBougth = async () => {
    const response = await fetchRecentlyBought();
    if (response.status === 'success' && response.data && typeof response.data === 'object' && 'total' in response.data) {
      myRecentlyBougth.value = (response.data as { total: ProductInterface[] }).total;
    }
  };

  const addresses = async () => {
    myAddresses.value = [];
    const shipping = ref<ShippingAddressInterface>({
      alias: '-',
      name1: '-',
      name2: '-',
      default: false,
      country: '-',
      region: '-',
      city: '-',
      postcode: '-',
      phone: '-',
    });
    const billing = ref<BillingAddressInterface>({
      alias: '-',
      name1: '-',
      name2: '-',
      default: false,
      country: '-',
      region: '-',
      city: '-',
      postcode: '-',
      phone: '-',
    });

    const details =
      userDetails.value?.accountType === AccountType.Personal ? userDetails.value?.personalDetails : userDetails.value?.companyDetails;

    // get default shipping address
    if (details?.shippingAddress) {
      const defaultShipping = details.shippingAddress.find((address) => address.default) ?? details.shippingAddress[0];
      if (defaultShipping) shipping.value = defaultShipping;
    }
    if (details?.billingAddress) {
      const defaultBilling = details.billingAddress.find((address) => address.default) ?? details.billingAddress[0];
      if (defaultBilling) billing.value = defaultBilling;
    }
    myAddresses.value.push(shipping.value);
    myAddresses.value.push(billing.value);
  };

  const viewHistory = async () => {
    const history = await fetchViewHistory();
    if (history.status === 'success') {
      myViewHistory.value = history.data.map((item: ViewHistoryProductInterface) => item.productInfo);
    }
  };

  const monthHotSale = async () => {
    const hotSale = await fetchMonthHotSale();
    if (hotSale.status === 'success') {
      myMonthHotSale.value = hotSale.data;
      await hotSalesFunction();
    }
  };

  const hotSalesFunction = async () => {
    const currMonthName = format(new Date(), 'MMMM');
    const currencyLabel = useRegionalPreferencesStore().currency?.label || 'Lei';

    hotSales.value = myMonthHotSale.value.map((slide): ProductBannerInterface => {
      const discountPrice = resolveProductBrowsePricing(slide, getUserDetails.value);
      return {
        title: `${currMonthName} hot sale`,
        discount: `${discountPrice?.productDiscount || discountPrice?.userDiscount || 0} %`,
        productCode: slide.manufacturerCode ?? '',
        description: slide.description ?? '',
        details: slide.variant ?? slide.measure ?? '',
        originalPrice:
          discountPrice?.priceConfiguration?.price != null
            ? `${discountPrice.priceConfiguration.price.toFixed(2)} ${currencyLabel} (${
                discountPrice.minimumOrderQuantityConfiguration?.quantity ?? 1
              }+)`
            : `— ${currencyLabel}`,
        salePrice:
          discountPrice?.currentConfigurationDiscountPrice != null
            ? `${discountPrice.currentConfigurationDiscountPrice.toFixed(2)} ${currencyLabel}`
            : `— ${currencyLabel}`,
        _id: slide._id,
        quantity: discountPrice?.minimumOrderQuantityConfiguration?.quantity ?? 1,
        availableStock: Number(slide.stock ?? 0),
        addToCartText: 'Add to cart',
      };
    });
  };

  const getDefaultCard = async () => {
    const cards = (await authStore.addUserCards()) ?? authStore.userCards ?? [];
    myCard.value = cards.find((card) => card.default) ?? null;
  };

  return {
    ordersIds,
    activeOrderFilter,
    myActivityData,
    myAccountInformation,
    myRecentlyBougth,
    myAddresses,
    myViewHistory,
    myMonthHotSale,
    hotSales,
    myCard,
    activeOrders,
    activityWidgets,
    customerInformation,
    recentlyBougth,
    addresses,
    viewHistory,
    monthHotSale,
    getDefaultCard,
  };
};
