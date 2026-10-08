/**
 * Crawl policy for routes that belong to a signed-in or in-progress buyer
 * flow. This list is the single source for every crawl surface: the
 * `usePrivateRouteSeo` robots meta, the `X-Robots-Tag` route rules in
 * `nuxt.config.ts`, and robots.txt disallow entries.
 */
export const PRIVATE_ROUTE_PREFIXES = [
  '/dashboard',
  '/checkout',
  '/cart',
  '/order-summary',
  '/order-tracking',
  '/login',
  '/signup',
  '/forgot-password',
  '/password-reset',
  '/verify-email',
  '/product/categories',
] as const;

export const PRIVATE_ROBOTS = 'noindex,nofollow';

/** Whether `path` is a private prefix or nested under one (whole segments only). */
export function isPrivateRoute(path: string): boolean {
  return PRIVATE_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

type RouteRule = { headers?: Record<string, string> } & Record<string, unknown>;

/**
 * Adds an `X-Robots-Tag` response header for every private prefix (exact and
 * nested) while keeping the rules already declared for those patterns. The
 * header also covers client-only routes (`ssr: false`), whose SPA shell never
 * renders the page's robots meta on the server.
 */
export function withPrivateRobotsHeaders<T extends Record<string, RouteRule>>(rules: T): Record<string, RouteRule> {
  const merged: Record<string, RouteRule> = { ...rules };

  for (const prefix of PRIVATE_ROUTE_PREFIXES) {
    for (const pattern of [prefix, `${prefix}/**`]) {
      const existing = merged[pattern];
      merged[pattern] = { ...existing, headers: { ...existing?.headers, 'X-Robots-Tag': PRIVATE_ROBOTS } };
    }
  }

  return merged;
}
