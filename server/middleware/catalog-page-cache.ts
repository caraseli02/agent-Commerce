import { defineEventHandler, getRequestURL, setResponseHeader } from 'h3';
import { isAnonymousCatalogPage } from '../catalog-isr-policy.mjs';

export default defineEventHandler((event) => {
  if (!useRuntimeConfig(event).catalogIsrPreview) return;
  const url = getRequestURL(event);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_nuxt/') || url.pathname.startsWith('/_ipx/')) return;
  event.context.catalogPageCacheCandidate = isAnonymousCatalogPage(url, event.method, event.node.req.headers);
  setResponseHeader(event, 'Cache-Control', 'private, no-store');
  setResponseHeader(event, 'CDN-Cache-Control', 'no-store');
  setResponseHeader(event, 'Vercel-CDN-Cache-Control', 'no-store');
});
