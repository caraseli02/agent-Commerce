import { mockCustomers, mockOrders, mockTransactions } from '~/server/utils/mockDashboardData';
import { mockProducts } from '~/server/utils/mockProducts';

type MockDashboardOrder = (typeof mockOrders)[number];
type MockDashboardOrderItem = MockDashboardOrder['itemsDetails'][number];
type MockProduct = (typeof mockProducts)[number];

type DemoOrderProduct = {
  id: string;
  stock: number;
  backorder_stock: number;
  isFolder: boolean;
  initialUnitPrice: number;
  unitPriceAfterDiscounts: number;
  subtotal: number;
  total: number;
  discount: {
    value: number;
    startDate: string;
    endDate: string;
  };
  productEntity: MockProduct;
};

const DEFAULT_USER_ID = 'mock-user-1';
const DEFAULT_CUSTOMER_ID = 'customer-001';

const userIdToCustomerId: Record<string, string> = {
  'mock-user-1': 'customer-001',
};

const statusMap: Record<string, string> = {
  delivered: 'Delivered',
  shipped: 'Processing',
  processing: 'Processing',
  pending: 'Pending',
  cancelled: 'Canceled',
  canceled: 'Canceled',
  refunded: 'Refunded',
  completed: 'Completed',
};

const paymentStatusMap: Record<string, number> = {
  pending: 0,
  paid: 1,
  completed: 1,
  canceled: 2,
  cancelled: 2,
  declined: 3,
  failed: 4,
};

const paymentTypeMap: Record<string, number> = {
  payment: 0,
  credit: 1,
  refund: 3,
};

const splitName = (name = 'Demo User') => {
  const [firstName, ...rest] = name.split(' ');

  return {
    firstName: firstName || 'Demo',
    lastName: rest.join(' ') || 'User',
  };
};

const normalizeUserId = (userId?: string) => String(userId || DEFAULT_USER_ID);

export const resolveCustomerId = (userId?: string) => {
  const normalizedUserId = normalizeUserId(userId);

  if (mockCustomers.some(customer => customer._id === normalizedUserId)) {
    return normalizedUserId;
  }

  return userIdToCustomerId[normalizedUserId] || DEFAULT_CUSTOMER_ID;
};

export const getDemoCustomer = (userId?: string) => {
  const customerId = resolveCustomerId(userId);

  return mockCustomers.find(customer => customer._id === customerId) || mockCustomers[0];
};

export const getDemoAddresses = (userId?: string) => {
  const customer = getDemoCustomer(userId);
  const name = splitName(customer.name);

  const baseAddress = {
    alias: 'Main Address',
    name1: `${name.firstName} ${name.lastName}`,
    name2: customer.address.street,
    country: customer.address.country === 'USA' ? 'US' : customer.address.country,
    region: customer.address.state,
    city: customer.address.city,
    postcode: customer.address.zip,
    phone: customer.phone,
    default: true,
  };

  return {
    shippingAddress: [
      {
        _id: 'shipping-1',
        ...baseAddress,
      },
    ],
    billingAddress: [
      {
        _id: 'billing-1',
        ...baseAddress,
        alias: 'Billing Address',
      },
    ],
  };
};

export const getDemoCredit = (userId?: string) => {
  const customerOrders = getDemoOrdersForUser(userId);
  const spent = customerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const limit = Math.max(12000, Math.ceil(spent / 1000) * 1000 + 4000);

  return {
    limit,
    spent: Number(spent.toFixed(2)),
    available: Number((limit - spent).toFixed(2)),
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    tillDue: '30',
    term: 30,
    freeze: false,
    active: true,
  };
};

export const getDemoCustomerSettings = () => {
  return {
    alertsAndNotifications: {
      newProducts: { email: true, app: true },
      hotDeals: { email: true, app: false },
      outOfStock: { email: true, app: false },
      priceChange: { email: true, app: true },
      shippingUpdates: { email: true, app: true },
    },
    marketingPreferences: {
      cookiesPolicy: { email: true, app: false },
      newsletter: { email: true, app: false },
      emailMarketing: { email: true, app: false },
    },
  };
};

export const getDemoUserProfile = (userId?: string) => {
  const normalizedUserId = normalizeUserId(userId);
  const customer = getDemoCustomer(userId);
  const orders = getDemoOrdersForUser(userId);
  const addresses = getDemoAddresses(userId);
  const name = splitName(customer.name);

  return {
    _id: normalizedUserId,
    firebaseId: normalizedUserId,
    role: 2,
    accountType: 0,
    verified: true,
    status: 1,
    clientCode: `P-${String(orders.length + 123456).slice(0, 6)}`,
    contactDetails: {
      firstName: name.firstName,
      lastName: name.lastName,
      email: customer.email,
      phone: customer.phone,
    },
    profileDetails: {
      email: customer.email,
    },
    personalDetails: {
      firstName: name.firstName,
      lastName: name.lastName,
      address: {
        _id: 'address-1',
        name1: customer.address.street,
        name2: '',
        country: customer.address.country === 'USA' ? 'US' : customer.address.country,
        region: customer.address.state,
        city: customer.address.city,
        postcode: customer.address.zip,
      },
      shippingAddress: addresses.shippingAddress,
      billingAddress: addresses.billingAddress,
    },
    adminSettings: {
      discount: {
        value: 5,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2027-01-01T00:00:00.000Z',
      },
      customerCredit: getDemoCredit(userId),
      marketingPreferences: {
        emailMarketing: {
          email: true,
          app: false,
        },
      },
    },
    ordersCount: orders.length,
    spent: Number(customer.totalSpent || 0),
    createdAt: customer.registeredAt,
    lastActivityDate: customer.lastLogin,
  };
};

const toOrderStatus = (status?: string) => statusMap[String(status || '').toLowerCase()] || 'Processing';

const toDemoOrderId = (index: number) => `ord-${index + 1}`;

const mapOrderItems = (order: MockDashboardOrder) => {
  const defaultDiscount = {
    value: 0,
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2027-01-01T00:00:00.000Z',
  };

  return (order.itemsDetails || []).map((item: MockDashboardOrderItem) => {
    const product = mockProducts.find(entry => entry._id === item.productId) || mockProducts[0];
    const quantity = Number(item.quantity || 1);
    const price = Number(item.price || 0);

    return {
      id: item.productId,
      stock: quantity,
      backorder_stock: 0,
      isFolder: false,
      initialUnitPrice: price,
      unitPriceAfterDiscounts: price,
      subtotal: Number((price * quantity).toFixed(2)),
      total: Number((price * quantity * 1.19).toFixed(2)),
      discount: defaultDiscount,
      productEntity: product,
    };
  });
};

const mapOrderToContract = (order: MockDashboardOrder, index: number, userId?: string) => {
  const customerId = order.customerId || resolveCustomerId(userId);
  const customer = mockCustomers.find(entry => entry._id === customerId) || getDemoCustomer(userId);
  const name = splitName(customer.name);

  return {
    _id: toDemoOrderId(index),
    shortId: order.orderNumber,
    user: {
      _id: normalizeUserId(userId),
      firebaseId: normalizeUserId(userId),
      role: 2,
      accountType: 0,
      verified: true,
      status: 1,
      contactDetails: {
        firstName: name.firstName,
        lastName: name.lastName,
        email: customer.email,
        phone: customer.phone,
      },
    },
    userId: normalizeUserId(userId),
    userName: customer.name,
    userEmail: customer.email,
    products: mapOrderItems(order),
    shippingDetails: {
      firstName: name.firstName,
      lastName: name.lastName,
      phone: customer.phone,
      email: customer.email,
      city: customer.address.city,
      country: customer.address.country === 'USA' ? 'US' : customer.address.country,
      address: {
        _id: 'shipping-order-1',
        default: true,
        name1: customer.address.street,
        name2: '',
        postcode: customer.address.zip,
        country: customer.address.country === 'USA' ? 'US' : customer.address.country,
        city: customer.address.city,
        region: customer.address.state,
      },
      billingAddress: {
        _id: 'billing-order-1',
        default: true,
        name1: customer.address.street,
        name2: '',
        postcode: customer.address.zip,
        country: customer.address.country === 'USA' ? 'US' : customer.address.country,
        city: customer.address.city,
        region: customer.address.state,
      },
      deliveryTypeId: 'demo-delivery',
      stockorderShippingType: {
        price: {
          total: 19.9,
          noVat: 16.72,
        },
        service: {
          id: 1,
          courierName: 'Demo Express',
          name: 'Standard Delivery',
        },
      },
      statusTracking: {
        awb: `AWB-${toDemoOrderId(index).toUpperCase()}`,
        uniqueId: `trk-${toDemoOrderId(index)}`,
        estimatedPickUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
      },
    },
    paymentDetails: {
      type: 3,
      status: toOrderStatus(order.status) === 'Pending' ? 0 : 1,
      invoiceId: `inv-${toDemoOrderId(index)}`,
      invoiceShortId: `INV-${String(index + 1).padStart(4, '0')}`,
    },
    total: Number(order.total || 0),
    subtotal: Number((Number(order.total || 0) * 0.84).toFixed(2)),
    margin: 0,
    currency: 'Lei',
    status: toOrderStatus(order.status),
    type: 0,
    shippingCost: 19.9,
    smallOrderCost: 0,
    notes: [
      {
        _id: `note-${toDemoOrderId(index)}`,
        sender: 'System',
        message: 'Demo order loaded from mock mode.',
        createdAt: order.createdAt,
        updatedAt: order.createdAt,
      },
    ],
    createdAt: order.createdAt,
    updatedAt: order.deliveredAt || order.shippedAt || order.cancelledAt || order.createdAt,
  };
};

export const getDemoOrders = (userId?: string) => {
  return mockOrders.map((order, index) => mapOrderToContract(order, index, userId));
};

export const getDemoOrdersForUser = (userId?: string) => {
  const customerId = resolveCustomerId(userId);

  return getDemoOrders(userId).filter((order) => {
    const matchingCustomer = mockCustomers.find((customer) => {
      return customer.email === order.user.contactDetails.email && customer._id === customerId;
    });

    return Boolean(matchingCustomer);
  });
};

export const findDemoOrder = (id?: string, userId?: string) => {
  const searchId = String(id || '').toLowerCase();
  const orders = getDemoOrders(userId);

  return orders.find((order) => {
    return (
      String(order._id || '').toLowerCase() === searchId
      || String(order.shortId || '').toLowerCase() === searchId
      || String(order.shortId || '')
        .replace('#', '')
        .toLowerCase() === searchId
    );
  });
};

export const getDemoTransactions = (userId?: string) => {
  const customerId = resolveCustomerId(userId);

  return mockTransactions
    .filter(transaction => transaction.customerId === customerId)
    .slice(0, 10)
    .map((transaction, index) => ({
      _id: transaction._id,
      shortId: `TRX-${String(index + 1).padStart(4, '0')}`,
      orderId: transaction.orderId || '',
      orderShortId: transaction.orderId || '',
      user: normalizeUserId(userId),
      amount: Math.abs(Number(transaction.amount || 0)),
      type: paymentTypeMap[String(transaction.type || '').toLowerCase()] ?? 0,
      status: paymentStatusMap[String(transaction.status || '').toLowerCase()] ?? 1,
      createdAt: transaction.date,
      updatedAt: transaction.date,
    }));
};

export const getClientDashboardData = (userId?: string) => {
  const customerOrders = getDemoOrdersForUser(userId);
  const recentOrders = customerOrders.slice(0, 5);
  const totalOrders = customerOrders.length;
  const deliveredOrders = customerOrders.filter(order => order.status === 'Delivered').length;
  const returns = Math.min(2, Math.max(0, totalOrders - deliveredOrders));

  const recentlyBought = recentOrders
    .flatMap(order => order.products || [])
    .slice(0, 5)
    .map(item => item.productEntity)
    .filter(Boolean);

  const viewHistory = mockProducts.slice(0, 8).map((product, index) => ({
    _id: `history-${index + 1}`,
    productId: product._id,
    count: Math.max(1, 8 - index),
    createdAt: new Date(Date.now() - index * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - index * 86400000).toISOString(),
    productInfo: product,
  }));

  const hotSale = mockProducts.slice(0, 5).map((product, index) => ({
    ...product,
    adminSettings: {
      discount: {
        value: 10 + index,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2027-01-01T00:00:00.000Z',
      },
    },
  }));

  return {
    activeOrders: recentOrders.slice(0, 4).map(order => ({
      _id: order._id,
      shortId: order.shortId,
    })),
    favorites: {
      folders_number: 3,
      products_number: 12,
    },
    totalOrders: {
      total_orders: totalOrders,
      total_orders_current_month: Math.min(3, totalOrders),
    },
    returns: {
      total: returns,
    },
    recentlyBought: {
      total: recentlyBought,
    },
    viewHistory,
    monthHotSale: hotSale,
    metadata: {
      ordersCount: totalOrders,
      favoritesCount: 12,
      messagesCount: 2,
      organizationCount: 1,
      agentsCount: 2,
      transactionsCount: getDemoTransactions(userId).length,
      auditLogsCount: 4,
    },
  };
};

export const getOrderWidgetTotal = (type?: string) => {
  const normalizedType = String(type || '').toLowerCase();
  const orders = getDemoOrders();

  switch (normalizedType) {
    case 'total-orders':
      return orders.length;
    case 'revenue-growth':
      return 18.4;
    case 'gross-revenue':
      return orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    case 'gross-margin':
      return orders.reduce((sum, order) => sum + Number(order.total || 0), 0) * 0.27;
    case 'total-stock-value':
      return mockProducts.reduce(
        (sum, product) => sum + Number(product.stock || 0) * Number(product.priceHistory?.[0]?.price || 0),
        0,
      );
    case 'average-order-value': {
      const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      return orders.length ? total / orders.length : 0;
    }
    case 'active-cart-sessions':
      return 24;
    case 'products-sold':
      return orders.reduce(
        (sum, order) =>
          sum
          + (order.products || []).reduce((itemsSum: number, item: DemoOrderProduct) => itemsSum + Number(item.stock || 0), 0),
        0,
      );
    case 'returns':
      return 9;
    case 'refunds':
      return 4;
    default:
      return 0;
  }
};
