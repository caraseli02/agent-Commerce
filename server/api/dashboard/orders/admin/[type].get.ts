import { getOrderWidgetTotal } from '~~/server/utils/mockDashboardDemo';

export default defineEventHandler((event) => {
  const type = getRouterParam(event, 'type');

  return {
    status: 'success',
    data: {
      total: getOrderWidgetTotal(type),
    },
  };
});
