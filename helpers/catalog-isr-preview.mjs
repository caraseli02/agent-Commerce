/** @param {Record<string, string | undefined>} [env] */
/** Controlled mock Preview only; production and normal local builds stay dynamic. */
export function isCatalogIsrPreview(env = process.env) {
  return env.VERCEL_ENV === 'preview' && (env.VERCEL === '1' || env.NITRO_PRESET === 'vercel') && env.NUXT_PUBLIC_MOCK_MODE === 'true';
}
