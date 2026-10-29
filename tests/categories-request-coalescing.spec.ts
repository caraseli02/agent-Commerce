import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  deleteCategories: vi.fn(),
  duplicateCategory: vi.fn(),
  mergeCategories: vi.fn(),
  moveCategories: vi.fn(),
  toggleCategoryStatus: vi.fn(),
  updateCategory: vi.fn(),
}));

vi.mock('~/composables/api/categories', () => api);

const taxonomyResponse = (name: string) => ({
  data: { _id: 'taxonomy-1', locked: false, data: [{ id: name, name, path: name, subcategory: [] }] },
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('useCategories request sharing (#795)', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(api).forEach((fn) => fn.mockReset());
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { MOCK_MODE: false } }));
  });

  it('sends one taxonomy request for concurrent storefront calls', async () => {
    const { useCategories } = await import('~/composables/useCategories');
    const pending = deferred<ReturnType<typeof taxonomyResponse>>();
    api.getCategories.mockReturnValueOnce(pending.promise);

    // The hero, the header menu and the mobile sheet all load categories on mount.
    const calls = [useCategories().getCategories(), useCategories().getCategories(), useCategories().getCategories()];
    expect(api.getCategories).toHaveBeenCalledTimes(1);

    pending.resolve(taxonomyResponse('semiconductors'));
    await Promise.all(calls);
    expect(useCategories().categories.value.map((category) => category.name)).toEqual(['semiconductors']);

    api.getCategories.mockResolvedValueOnce(taxonomyResponse('passives'));
    await useCategories().getCategories();
    expect(api.getCategories).toHaveBeenCalledTimes(2);
    expect(useCategories().categories.value.map((category) => category.name)).toEqual(['passives']);
  });

  it('starts a new request after a failed one settles', async () => {
    const { useCategories } = await import('~/composables/useCategories');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.getCategories.mockRejectedValueOnce(new Error('offline'));
    await useCategories().getCategories();

    api.getCategories.mockResolvedValueOnce(taxonomyResponse('connectors'));
    await useCategories().getCategories();
    expect(api.getCategories).toHaveBeenCalledTimes(2);
    expect(useCategories().categories.value.map((category) => category.name)).toEqual(['connectors']);
    consoleError.mockRestore();
  });

  it('refetches after a mutation even while a storefront request is in flight', async () => {
    const { useCategories } = await import('~/composables/useCategories');
    const stale = deferred<ReturnType<typeof taxonomyResponse>>();
    api.getCategories.mockReturnValueOnce(stale.promise);
    const storefrontLoad = useCategories().getCategories();

    api.createCategory.mockResolvedValueOnce({ status: 'success' });
    api.getCategories.mockResolvedValueOnce(taxonomyResponse('after-create'));
    await useCategories().createCategory({ name: 'after-create' } as never);

    expect(api.getCategories).toHaveBeenCalledTimes(2);
    expect(useCategories().categories.value.map((category) => category.name)).toEqual(['after-create']);

    stale.resolve(taxonomyResponse('before-create'));
    await storefrontLoad;
  });
});
