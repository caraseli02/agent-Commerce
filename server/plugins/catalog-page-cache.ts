import { getResponseHeader, removeResponseHeader, setResponseHeaders } from 'h3';

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    if (!event.context.catalogPageCacheCandidate) return;
    if (event.context.catalogPageCacheHealthy && event.node.res.statusCode === 200 && !getResponseHeader(event, 'set-cookie')) {
      setResponseHeaders(event, {
        'Cache-Control': 'public, max-age=0, s-maxage=30',
        'CDN-Cache-Control': 'public, s-maxage=30',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=30',
      });
    } else {
      setResponseHeaders(event, {
        'Cache-Control': 'private, no-store',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      });
      removeResponseHeader(event, 'X-Catalog-Page-Generated-At');
    }
  });
});
