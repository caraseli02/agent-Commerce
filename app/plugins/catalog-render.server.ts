import { getResponseHeader, removeResponseHeader, setResponseHeader, setResponseStatus } from 'h3';

export default defineNuxtPlugin({
  name: 'anonymous-catalog-render',
  enforce: 'post',
  setup(nuxtApp) {
    const event = nuxtApp.ssrContext?.event;
    if (!event?.context.catalogPageCacheCandidate) return;
    // One serialized anonymous representation; the viewport module measures
    // the actual device after hydration and updates its reactive breakpoint.
    nuxtApp.$viewport.breakpoint.value = 'lg';
    const preventCaching = () => {
      event.context.catalogPageCacheHealthy = false;
      setResponseHeader(event, 'Cache-Control', 'private, no-store');
      setResponseHeader(event, 'CDN-Cache-Control', 'no-store');
      setResponseHeader(event, 'Vercel-CDN-Cache-Control', 'no-store');
      removeResponseHeader(event, 'X-Catalog-Page-Generated-At');
    };
    nuxtApp.hook('app:error', preventCaching);
    nuxtApp.hook('app:rendered', () => {
      if (Object.values(nuxtApp.payload._errors).some(Boolean)) {
        setResponseStatus(event, 503);
        preventCaching();
      } else if (event.node.res.statusCode !== 200 || getResponseHeader(event, 'set-cookie')) {
        preventCaching();
      } else {
        event.context.catalogPageCacheHealthy = true;
        const generatedAt = Date.now();
        // A body marker distinguishes a fresh render from retained CDN headers.
        nuxtApp.payload.state.catalogPageGeneratedAt = generatedAt;
        setResponseHeader(event, 'X-Catalog-Page-Generated-At', String(generatedAt));
      }
    });
  },
});
