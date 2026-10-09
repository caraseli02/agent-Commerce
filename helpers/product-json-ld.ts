import { resolveCustomerUnitPrice } from '~/helpers/cart-pricing';
import { buildCategoryCrumbs, categoryBrowseUrl, getProductTaxonomyPath } from '~/helpers/categoryPath.helper';
import type { ProductDetail } from '~/types/product';

type JsonLdNode = Record<string, unknown>;

export interface ProductJsonLdContext {
  /** Resolves a site-relative, protocol-relative or absolute URL to an absolute one. */
  toAbsoluteUrl: (url: string) => string;
  /** Absolute URL of the product page being described. */
  pageUrl: string;
}

/** The catalog prices in Lei; checkout (`useOrder`) places orders with the same ISO code. */
export const PRODUCT_PRICE_CURRENCY = 'RON';

const IN_STOCK = 'https://schema.org/InStock';
// The stock badge labels sold-out products "backorder only", so structured data says the same.
const BACK_ORDER = 'https://schema.org/BackOrder';

const clean = (value: string | null | undefined) => (typeof value === 'string' ? value.trim() : '');

/** Drops keys that carry no data so absent product fields never serialize as empty strings. */
const compact = (node: JsonLdNode): JsonLdNode =>
  Object.fromEntries(Object.entries(node).filter(([, value]) => value !== undefined && value !== null && value !== ''));

const buildOffer = (product: ProductDetail, { toAbsoluteUrl, pageUrl }: ProductJsonLdContext): JsonLdNode | undefined => {
  // Same price the purchase panel shows an anonymous visitor: entry tier, minus any product discount.
  const price = resolveCustomerUnitPrice(product);

  if (!(price > 0)) {
    return undefined;
  }

  const stock = Number(product.stock);
  const hasStock = product.stock !== undefined && product.stock !== null && Number.isFinite(stock);

  return compact({
    '@type': 'Offer',
    url: toAbsoluteUrl(pageUrl),
    price,
    priceCurrency: PRODUCT_PRICE_CURRENCY,
    availability: hasStock ? (stock > 0 ? IN_STOCK : BACK_ORDER) : undefined,
  });
};

/** schema.org Product node for a product detail page. */
export function buildProductJsonLd(product: ProductDetail, context: ProductJsonLdContext): JsonLdNode {
  const { toAbsoluteUrl, pageUrl } = context;
  const image = clean(product.details?.ProductImage?.ProductImageLarge);
  const manufacturer = clean(product.manufacturer) || clean(product.details?.SummaryData?.Manufacturer);
  const url = toAbsoluteUrl(pageUrl);

  return compact({
    '@type': 'Product',
    '@id': `${url}#product`,
    name: clean(product.name),
    url,
    description: clean(product.description),
    image: image ? [toAbsoluteUrl(image)] : undefined,
    // `manufacturerCode` is a short manufacturer abbreviation in the catalog, not a part number, so no `mpn`.
    sku: clean(product.code) || clean(product.alias),
    brand: manufacturer ? { '@type': 'Brand', name: manufacturer } : undefined,
    offers: buildOffer(product, context),
  });
}

/**
 * schema.org BreadcrumbList: Home → taxonomy levels (same names and browse links as the page's
 * breadcrumb UI) → the product. Returns null when the product has no taxonomy crumbs.
 */
export function buildBreadcrumbJsonLd(product: ProductDetail, { toAbsoluteUrl, pageUrl }: ProductJsonLdContext): JsonLdNode | null {
  const taxonomyPath = getProductTaxonomyPath(product);
  const crumbs = buildCategoryCrumbs(taxonomyPath ? taxonomyPath.split('>') : []);

  if (!crumbs.length) {
    return null;
  }

  const url = toAbsoluteUrl(pageUrl);
  const items = [
    { name: 'Home', item: toAbsoluteUrl('/') },
    ...crumbs.map((crumb) => ({ name: crumb.name, item: toAbsoluteUrl(categoryBrowseUrl(crumb)) })),
    { name: clean(product.name), item: url },
  ];

  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: items.map((entry, index) => ({ '@type': 'ListItem', position: index + 1, ...entry })),
  };
}

/** Product page structured data: one `@graph` so a single schema.org context covers every node. */
export function buildProductPageJsonLd(product: ProductDetail, context: ProductJsonLdContext): JsonLdNode {
  const breadcrumbs = buildBreadcrumbJsonLd(product, context);

  return {
    '@context': 'https://schema.org',
    '@graph': [buildProductJsonLd(product, context), ...(breadcrumbs ? [breadcrumbs] : [])],
  };
}
