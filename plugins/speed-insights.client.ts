import { injectSpeedInsights } from '@vercel/speed-insights/nuxt/runtime';

export default defineNuxtPlugin(() => {
  injectSpeedInsights();
});
