import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import moment from 'moment';
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
} from '~/model/dashboard/customer-information/customer-information';
import type { BillingAddressInterface, ShippingAddressInterface, UserInterface } from '~/types/auth/user-interface';
import type { ProductInterface } from '~/model/products/response/ProductResponse';
import { AccountType } from '~/types';
import type { StripeCardInterface } from '~/types';
import { parseProductPriceConfiguration } from '~/helpers/prices.helper';

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
const myActivityData = ref<CustomerDashboardActivityData>({} as CustomerDashboardActivityData);
const myAccountInformation = ref<UserInterface>({} as UserInterface);
const myRecentlyBougth = ref<ProductInterface[]>([]);
const myAddresses = ref<ShippingAddressInterface[]>([]);
const myViewHistory = ref<ProductInterface[]>([]);
const myMonthHotSale = ref<ProductInterface[]>([]);
const hotSales = ref<ProductBannerInterface[]>([]);
const myCard = ref<StripeCardInterface>({} as StripeCardInterface);

export const useCustomerDashboard = () => {
  const userDetails = useAuthStore().userDetails;
  const userCards = useAuthStore().userCards;
  const authStore = useAuthStore();
  const { getUserDetails } = storeToRefs(authStore);

  const activeOrders = async () => {
    const { data, status } = await fetchCustomerActiveOrders();
    if (status && data && data.total) {
      ordersIds.value = data.total.map((object) => {
        return { shortId: object.shortId, id: object._id };
      });
    }
  };

  const activityWidgets = async () => {
    myActivityData.value = {} as CustomerDashboardActivityData;
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
    if (userDetails) {
      myAccountInformation.value = userDetails;
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

    const details = userDetails?.accountType === AccountType.Personal ? userDetails?.personalDetails : userDetails?.companyDetails;

    // get default shipping address
    if (details?.shippingAddress) {
      shipping.value = details?.shippingAddress.find(address => address.default) || details?.shippingAddress[0];
    }
    if (details?.billingAddress) {
      billing.value = details?.billingAddress.find(address => address.default) || details?.billingAddress[0];
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
    const currMonthName = moment().format('MMMM');

    hotSales.value = myMonthHotSale.value.map((slide): ProductBannerInterface => {
      const discountPrice = parseProductPriceConfiguration(slide, getUserDetails.value, slide.stock);
      return {
        title: `${currMonthName} hot sale`,
        discount: `${slide.adminSettings?.discount?.value ?? 0} %`,
        productCode: slide.manufacturerCode ?? '',
        description: slide.description ?? '',
        details: slide.variant ?? slide.measure ?? '',
        originalPrice: `$ ${discountPrice?.priceConfiguration.price.toFixed(2)} (${
          discountPrice?.minimumOrderQuantityConfiguration.quantity
        }+)`,
        salePrice: `$ ${discountPrice?.currentConfigurationDiscountPrice.toFixed(2)}`,
        _id: slide._id,
        quantity: discountPrice?.minimumOrderQuantityConfiguration.quantity ?? 0,
        addToCartText: 'Add to cart',
      };
    });
  };

  const getDefaultCard = async () => {
    myCard.value = userCards?.filter(card => card.default)[0] as StripeCardInterface;
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
