import { mockProducts } from './utils/mockProducts.ts';

// Only products in the build's public demo snapshot can enter ISR. Unknown
// products stay dynamic, avoiding provider-owned generation error responses.
export const catalogProductSlugs = mockProducts.flatMap((product) => [product._id, product.alias]);
