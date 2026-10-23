import { orders } from '~~/server/domain/orders';
import { getOrderWidgetTotal } from '~~/server/utils/mockDashboardDemo';
import { requireRequester } from '~~/server/utils/requireRequester';

type PersistedOrder = Awaited<ReturnType<typeof orders.list>>[number];

const orderTotal = (order: PersistedOrder) => Number(order.money?.total ?? order.total ?? 0);
const unitsInOrder = (order: PersistedOrder) => (order.products || []).reduce((sum, item) => sum + Number(item.stock || 0), 0);

// The Overview KPIs read the same persisted orders as the order list and tabs, so a newly
// placed order moves the count, revenue, average and units together.
const persistedOrderMetrics: Record<string, (list: PersistedOrder[]) => number> = {
  'total-orders': (list) => list.length,
  'gross-revenue': (list) => list.reduce((sum, order) => sum + orderTotal(order), 0),
  'average-order-value': (list) => (list.length ? list.reduce((sum, order) => sum + orderTotal(order), 0) / list.length : 0),
  'products-sold': (list) => list.reduce((sum, order) => sum + unitsInOrder(order), 0),
};

export default defineEventHandler(async (event) => {
  const requester = requireRequester(event);
  if (!requester.isAdmin) throw createError({ statusCode: 403, statusMessage: 'Forbidden' });

  const type = String(getRouterParam(event, 'type') || '').toLowerCase();
  const metric = persistedOrderMetrics[type];
  const total = metric ? metric(await orders.list()) : getOrderWidgetTotal(type);

  return {
    status: 'success',
    data: {
      total: Math.round(total * 100) / 100,
    },
  };
});
