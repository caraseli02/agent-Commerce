import { getQuery } from 'h3';
import { orders } from '~/server/domain/orders';
import { getMockUserFromAuthHeader } from '~/server/utils/mockUsers';
import { PaymentStatusEnum } from '~/types/order-summary/item';
import { AccountRole } from '~/types/signup/form';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = Math.max(1, Number(query.page || 1));
  const perPage = Math.max(1, Number(query.perPage || 10));

  const user = getMockUserFromAuthHeader(getHeaders(event).authorization);
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  const requestedUserId = typeof query.userId === 'string' ? query.userId.trim() : '';
  const scopedUserId = user.role === AccountRole.Admin && requestedUserId ? requestedUserId : user._id;

  // Transaction history is derived from durable paid Orders. Pending, failed, and
  // duplicate checkout attempts have no customer-visible transaction entry.
  const allTransactions = (await orders.list(scopedUserId))
    .filter((order) => order.paymentDetails?.status === PaymentStatusEnum.Paid)
    .map((order) => ({
      _id: `transaction-${order._id}`,
      shortId: `TX-${order.shortId}`,
      orderId: order._id,
      orderShortId: order.shortId,
      user: scopedUserId,
      invoiceId: order.paymentDetails?.invoiceId,
      invoiceShortId: order.paymentDetails?.invoiceId,
      amount: Number(order.total || 0),
      type: order.paymentDetails?.type ?? 3,
      status: PaymentStatusEnum.Paid,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const items = allTransactions.slice(start, end);

  return {
    status: 'success',
    data: {
      total_items: allTransactions.length,
      page_count: Math.max(1, Math.ceil(allTransactions.length / perPage)),
      page,
      items,
    },
  };
});
