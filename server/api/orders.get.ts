import { orders } from '~/server/domain/orders';
import { getMockUserFromAuthHeader } from '~/server/utils/mockUsers';
import { AccountRole } from '~/types/signup/form';

const parseStartDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const parsedNative = new Date(value);
  if (!Number.isNaN(parsedNative.getTime())) {
    return parsedNative;
  }

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const [, day, month, year, hours = '00', minutes = '00', seconds = '00'] = match;
  const parsedFallback = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds)));

  return Number.isNaN(parsedFallback.getTime()) ? null : parsedFallback;
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as {
    page?: string;
    perPage?: string;
    status?: string;
    userId?: string;
    startDate?: string;
  };

  const page = Number.parseInt(query.page || '1', 10);
  const perPage = Number.parseInt(query.perPage || '10', 10);
  const authenticatedUser = getMockUserFromAuthHeader(getHeaders(event).authorization);
  if (!authenticatedUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }
  const scopedUserId = authenticatedUser.role === AccountRole.Admin ? query.userId : authenticatedUser._id;

  let items = await orders.list(scopedUserId);

  if (query.status) {
    const statusFilters = String(query.status)
      .split(',')
      .map((status) => status.trim())
      .filter(Boolean);

    if (statusFilters.length > 0) {
      items = items.filter((order) => statusFilters.includes(String(order.status)));
    }
  }

  if (query.startDate) {
    const startDate = parseStartDate(String(query.startDate));

    if (startDate) {
      items = items.filter((order) => {
        const createdAt = new Date(order.createdAt || 0);

        return createdAt >= startDate;
      });
    }
  }

  const totalItems = items.length;
  const safePerPage = perPage > 0 ? perPage : totalItems || 1;
  const pageCount = Math.max(1, Math.ceil(totalItems / safePerPage));
  const currentPage = Math.max(1, Math.min(page, pageCount));
  const startIndex = (currentPage - 1) * safePerPage;

  const paginatedItems = perPage > 0 ? items.slice(startIndex, startIndex + safePerPage) : items;

  return {
    status: 'success',
    data: {
      total_items: totalItems,
      page_count: pageCount,
      page: currentPage,
      items: paginatedItems,
    },
  };
});
