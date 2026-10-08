import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

import { PRIVATE_ROBOTS, isPrivateRoute } from '~/helpers/seo-routes';

const SITE_NAME = 'Components Marketplace';
const DEFAULT_DESCRIPTION =
  'Browse thousands of electronic components from trusted manufacturers. Check live stock, compare specifications, and order with confidence.';

type JsonLd = Record<string, unknown>;

export interface PageSeoOptions {
  title: MaybeRefOrGetter<string>;
  description?: MaybeRefOrGetter<string | null | undefined>;
  /** Absolute, protocol-relative, or site-relative image URL; empty means no image. */
  image?: MaybeRefOrGetter<string | null | undefined>;
  type?: 'website' | 'product' | 'article';
  robots?: 'index,follow' | 'noindex,nofollow';
  /** Structured data emitted as one `application/ld+json` script; may be reactive for async page data. */
  jsonLd?: MaybeRefOrGetter<JsonLd | JsonLd[] | null | undefined>;
}

/**
 * Canonical site origin and absolute-URL resolver shared by every SEO surface (meta tags and
 * JSON-LD). `runtimeConfig.public.siteUrl` wins; the request origin is the fallback.
 */
export function useSiteUrl() {
  const configuredSiteUrl = String(useRuntimeConfig().public.siteUrl ?? '');
  const siteUrl = (configuredSiteUrl || useRequestURL().origin).replace(/\/+$/, '');

  const toAbsoluteUrl = (url: string) => {
    if (url.startsWith('//')) {
      return `https:${url}`;
    }

    return new URL(url, `${siteUrl}/`).href;
  };

  return { siteUrl, toAbsoluteUrl };
}

/**
 * Page-level SEO for storefront routes. Owns the site defaults (name,
 * description), absolute canonical/Open Graph URLs, Twitter card selection,
 * and JSON-LD output so pages only describe what they show.
 *
 * Site URL comes from `runtimeConfig.public.siteUrl` (`NUXT_PUBLIC_SITE_URL`)
 * and falls back to the request origin. `noindex,nofollow` pages emit only
 * their title and robots directive.
 */
export function usePageSeo(options: PageSeoOptions) {
  const title = computed(() => toValue(options.title));
  const robots = options.robots ?? 'index,follow';

  if (robots === PRIVATE_ROBOTS) {
    useSeoMeta({ title, robots });
    return;
  }

  const route = useRoute();
  const { siteUrl, toAbsoluteUrl } = useSiteUrl();

  const shareTitle = computed(() => `${title.value} | ${SITE_NAME}`);
  const description = computed(() => toValue(options.description) || DEFAULT_DESCRIPTION);
  const image = computed(() => {
    const url = toValue(options.image);
    return url ? toAbsoluteUrl(url) : undefined;
  });
  const pageUrl = computed(() => `${siteUrl}${route.path}`);

  useSeoMeta({
    title,
    description,
    robots,
    // Open Graph has no `product` type in unhead's union, but Facebook/Pinterest read it.
    ogType: (options.type ?? 'website') as 'website',
    ogSiteName: SITE_NAME,
    ogTitle: shareTitle,
    ogDescription: description,
    ogUrl: pageUrl,
    ogImage: image,
    twitterCard: () => (image.value ? 'summary_large_image' : 'summary'),
    twitterTitle: shareTitle,
    twitterDescription: description,
    twitterImage: image,
  });

  useHead({
    link: [{ rel: 'canonical', href: pageUrl }],
    script: computed(() => {
      const jsonLd = toValue(options.jsonLd);
      // unhead escapes `<` inside JSON script content, so serialized product text cannot close the tag.
      return jsonLd ? [{ key: 'page-seo-json-ld', type: 'application/ld+json' as const, textContent: JSON.stringify(jsonLd) }] : [];
    }),
  });
}

/**
 * Global crawl policy, called once from `app.vue`: routes under a private
 * prefix get `noindex,nofollow` without each page opting in. Public routes
 * emit nothing here and leave robots to their own `usePageSeo` call.
 */
export function usePrivateRouteSeo() {
  const route = useRoute();

  useSeoMeta({
    robots: () => (isPrivateRoute(route.path) ? PRIVATE_ROBOTS : undefined),
  });
}
