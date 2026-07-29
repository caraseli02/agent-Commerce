/**
 * Mock-mode fault injection for dashboard widget error-boundary tests.
 * Query `dashboardFault=<widgetId>` forces the matching widget to throw on mount.
 */
export function useDashboardWidgetFault(widgetId: string) {
  const route = useRoute();
  const config = useRuntimeConfig();

  onMounted(() => {
    if (config.public.MOCK_MODE && route.query.dashboardFault === widgetId) {
      throw new Error(`Forced fault for dashboard widget: ${widgetId}`);
    }
  });
}
