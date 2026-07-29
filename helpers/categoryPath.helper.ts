/**
 * Category paths are slug based across the storefront: `semiconductors/microcontrollers`.
 * Menu browse links, breadcrumbs, and the `?category=` search filter all speak this shape,
 * so taxonomy ids never leak into public URLs.
 */

export interface CategoryCrumb {
  name: string;
  path: string;
}

export interface CategoryPathSource {
  path?: string | null;
  category?: string | null;
  alias?: string | null;
  taxonomyPath?: string | null;
}

export function slugifyCategoryName(name: string): string {
  return String(name ?? '')
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function humanizeCategorySlug(slug: string): string {
  return String(slug ?? '')
    .split('-')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

/** Split a slug path (`a/b`) or a taxonomy label chain (`A > B`) into slug segments. */
export function toCategorySlugSegments(value: string): string[] {
  return String(value ?? '')
    .split(/[/>]/)
    .map((segment) => slugifyCategoryName(segment))
    .filter(Boolean);
}

/** Normalize any category reference (`Audio > Headphones`, `audio/headphones`, `Audio`) to a slug path. */
export function normalizeCategoryPath(value: string): string {
  return toCategorySlugSegments(value).join('/');
}

export function buildCategorySlugPath(names: string[]): string {
  return (names ?? [])
    .map((name) => slugifyCategoryName(name))
    .filter(Boolean)
    .join('/');
}

/** Crumbs for a taxonomy label chain; every crumb keeps its own full ancestor path. */
export function buildCategoryCrumbs(names: string[]): CategoryCrumb[] {
  const crumbs: CategoryCrumb[] = [];

  for (const rawName of names ?? []) {
    const name = String(rawName ?? '').trim();
    const slug = slugifyCategoryName(name);
    if (!name || !slug) {
      continue;
    }

    const parentPath = crumbs.length > 0 ? `${crumbs[crumbs.length - 1].path}/` : '';
    crumbs.push({ name, path: `${parentPath}${slug}` });
  }

  return crumbs;
}

/** Crumbs for an already slugified path. `resolveName` maps a full ancestor path back to its taxonomy name. */
export function buildSlugPathCrumbs(path: string, resolveName?: (path: string) => string | undefined): CategoryCrumb[] {
  const crumbs: CategoryCrumb[] = [];
  let prefix = '';

  for (const segment of toCategorySlugSegments(path)) {
    prefix = prefix ? `${prefix}/${segment}` : segment;
    crumbs.push({ name: resolveName?.(prefix) || humanizeCategorySlug(segment), path: prefix });
  }

  return crumbs;
}

/** Public browse URL for a taxonomy node. */
export function categoryBrowseUrl(category: { path?: string | null; name?: string | null }): string {
  const path = normalizeCategoryPath(category?.path ?? '') || slugifyCategoryName(category?.name ?? '');
  return path ? `/search?category=${encodeURIComponent(path)}` : '/search';
}

function isPathPrefix(prefix: string, candidate: string): boolean {
  return Boolean(prefix) && (candidate === prefix || candidate.startsWith(`${prefix}/`));
}

/** Slug paths a product can be reached by, most specific first. */
export function categoryPathCandidates(source: CategoryPathSource): string[] {
  return [source?.path, source?.taxonomyPath, source?.category, source?.alias]
    .map((value) => normalizeCategoryPath(value ?? ''))
    .filter(Boolean);
}

/**
 * Slug-path first category match: `semiconductors` matches everything below it, and a taxonomy
 * leaf that is deeper than the catalog (`semiconductors/microcontrollers/arm-cortex-m4`) still
 * resolves through the product path it belongs to.
 */
export function matchesCategoryPath(source: CategoryPathSource, category: string): boolean {
  const target = normalizeCategoryPath(category);
  if (!target) {
    return true;
  }

  const candidates = categoryPathCandidates(source);
  if (candidates.some((candidate) => isPathPrefix(target, candidate))) {
    return true;
  }

  // Only nested product paths widen the match; a bare top-level category must not swallow unrelated leaves.
  return candidates.some((candidate) => candidate.includes('/') && isPathPrefix(candidate, target));
}
