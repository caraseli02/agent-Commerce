import path from 'node:path';

export const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
export const OUTPUT_DIR = path.join(ROOT, '.output/public/_nuxt');
export const PRECOMPUTED_PATH = path.join(ROOT, '.output/server/chunks/virtual/precomputed.mjs');
