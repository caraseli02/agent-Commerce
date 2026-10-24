// useCategories.ts
import { computed, ref } from 'vue';
import {
  createCategory as createCategoryRequest,
  deleteCategories as deleteCategoriesRequest,
  duplicateCategory as duplicateCategoryRequest,
  getCategories as getCategoriesRequest,
  mergeCategories as mergeCategoriesRequest,
  moveCategories as moveCategoriesRequest,
  toggleCategoryStatus as toggleCategoryStatusRequest,
  updateCategory as updateCategoryRequest,
} from '~/composables/api/categories';
import type { ICreatePayload, TaxonomyInterface } from '~~/types/dashboard/categories';
import { buildDemoTaxonomyTree } from '~~/data/demoTaxonomyTree';

const selectedCategories = ref<string[]>([]);
const showDeleteAlert = ref(false);
const categories = ref<TaxonomyInterface[]>([]);
const taxonomyId = ref('');
const isLoading = ref(false);
const isLocked = ref(false);

const searchQuery = ref('');
const sortBy = ref<'name' | 'averageWeight' | 'productCount'>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');
let pendingCategoriesRequest: Promise<void> | null = null;

const categoriesOptions = computed(() => {
  if (categories.value && categories.value.length > 0) {
    return extractIdAndName(categories.value);
  }
  return [];
});

const setDemoTaxonomy = () => {
  categories.value = buildDemoTaxonomyTree();
  taxonomyId.value = 'demo-taxonomy';
  isLocked.value = false;
};

export const useCategories = () => {
  const config = useRuntimeConfig();

  // Mutation refreshes call this directly so they never reuse a request that started before the change.
  const fetchCategories = async () => {
    isLoading.value = true;
    selectedCategories.value = [];
    try {
      if (config.public.MOCK_MODE) {
        setDemoTaxonomy();
        return;
      }

      const response = await getCategoriesRequest();
      categories.value = response.data.data;
      taxonomyId.value = response.data._id;
      isLocked.value = response.data.locked;
    } catch (error) {
      if (config.public.MOCK_MODE) {
        setDemoTaxonomy();
        return;
      }
      console.error('Failed to fetch counts from API:', error);
    } finally {
      isLoading.value = false;
    }
  };

  // The hero and both header menus load categories on mount; concurrent calls share one request (#795).
  const getCategories = () => {
    pendingCategoriesRequest ??= fetchCategories().finally(() => {
      pendingCategoriesRequest = null;
    });
    return pendingCategoriesRequest;
  };

  const getCategoriesBySearchQuery = async (): Promise<TaxonomyInterface[]> => {
    const search = (items: TaxonomyInterface[], query: string): TaxonomyInterface[] => {
      return items.filter((category) => {
        if (category.name.toLowerCase().includes(query.toLowerCase())) {
          return true;
        }
        if (category.subcategory && category.subcategory.length > 0) {
          return search(category.subcategory, query).length > 0;
        }
        return false;
      });
    };

    return search(categories.value, searchQuery.value);
  };

  const createCategory = async (payload: ICreatePayload) => {
    const response = await createCategoryRequest(taxonomyId.value, payload);
    if (response.status === 'success') {
      await fetchCategories();
      return response.status;
    }
  };

  const deleteCategories = async (categoryIds: string[]) => {
    const response = await deleteCategoriesRequest(taxonomyId.value, categoryIds);
    if (response.status === 'success') {
      await fetchCategories();
    }
  };

  const updateCategory = async (categoryId: string, payload: ICreatePayload) => {
    const response = await updateCategoryRequest(taxonomyId.value, categoryId, payload);
    if (response.status === 'success') {
      await fetchCategories();
    }
    return response;
  };

  const toggleCategoryStatus = async (categoryId: string) => {
    const response = await toggleCategoryStatusRequest(taxonomyId.value, categoryId);
    if (response.status === 'success') {
      await fetchCategories();
      return response.status;
    }
  };

  const duplicateCategory = async (sourceId: string, parentId?: string) => {
    const response = await duplicateCategoryRequest(taxonomyId.value, sourceId, parentId);
    if (response.status === 'success') {
      await fetchCategories();
    }
  };

  const mergeCategories = async (sourceIds: string[], targetID: string) => {
    const response = await mergeCategoriesRequest(taxonomyId.value, sourceIds, targetID);
    if (response.status === 'success') {
      await fetchCategories();
    }
  };

  const moveCategories = async (categoryIds: string[], parentId: string) => {
    const response = await moveCategoriesRequest(taxonomyId.value, categoryIds, parentId);
    if (response.status === 'success') {
      await fetchCategories();
    }
  };

  const selectCategory = (categoryId: string) => {
    const selectedIndex = selectedCategories.value.indexOf(categoryId);
    if (selectedIndex !== -1) {
      selectedCategories.value.splice(selectedIndex, 1);
    } else {
      selectedCategories.value.push(categoryId);
    }
  };

  // Filter and sort logic
  const filteredData = computed(() => filterByQuery(categories.value, searchQuery.value));
  const sortedData = computed(() => sortByField(filteredData.value, sortBy.value, sortOrder.value));

  return {
    selectedCategories,
    showDeleteAlert,
    categories,
    taxonomyId,
    searchQuery,
    sortOrder,
    isLocked,
    getCategoriesBySearchQuery,
    getCategories,
    createCategory,
    deleteCategories,
    updateCategory,
    toggleCategoryStatus,
    duplicateCategory,
    mergeCategories,
    moveCategories,
    selectCategory,
    filteredAndSortedData: sortedData,
    categoriesOptions,
    isLoading,
  };
};
