import { computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCategories } from '@/composables/useCategories';
import type { TaxonomyInterface } from '~/types/dashboard/categories';

export function useCategoriesNavigation() {
  const { categories } = useCategories();

  const isOpen = useState<boolean>('main-menu-is-open', () => false);
  const selectedCategories = useState<TaxonomyInterface[]>('main-menu-selected-categories', () => []);
  const currentCategory = computed(() =>
    selectedCategories.value.length > 0 ? selectedCategories.value[selectedCategories.value.length - 1] : null
  );

  const router = useRouter();

  function browseCategory(category: TaxonomyInterface) {
    isOpen.value = false;
    selectedCategories.value = [];
    // Prefer keyword so mock catalog matches by name/features (IDs alone return empty).
    router.push(`/search?keyword=${encodeURIComponent(category.name)}`);
  }

  function onCategoryClick(category: TaxonomyInterface, makeReset: boolean) {
    const subcategories = category.subcategory ?? [];
    if (makeReset) selectedCategories.value = [];
    if (subcategories.length === 0) {
      browseCategory(category);
    } else {
      selectedCategories.value.push(category);
    }
  }

  function resetCategories() {
    selectedCategories.value = [];
  }

  watch(isOpen, (open) => {
    if (!open) {
      selectedCategories.value = [];
    }
  });

  return {
    categories,
    selectedCategories,
    currentCategory,
    isOpen,
    onCategoryClick,
    browseCategory,
    resetCategories,
  };
}
