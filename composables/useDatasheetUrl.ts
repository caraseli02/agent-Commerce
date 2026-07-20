/**
 * Resolves mock/API datasheet filenames to absolute public paths so they are not
 * treated as relative URLs under the current product route (e.g. /product/datasheet-*.pdf).
 */
export function resolveDatasheetUrl(datasheet?: string | null): string | undefined {
  if (!datasheet) {
    return undefined;
  }

  if (/^https?:\/\//i.test(datasheet) || datasheet.startsWith('/')) {
    return datasheet;
  }

  const filename = datasheet.replace(/^\.?\//, '');
  return `/datasheets/${filename}`;
}

export function useDatasheetUrl(datasheet: MaybeRefOrGetter<string | undefined | null>) {
  return computed(() => resolveDatasheetUrl(toValue(datasheet)));
}
