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

  function onCategoryClick(category: TaxonomyInterface, makeReset: boolean) {
    const subcategories = category.subcategory ?? [];
    if (makeReset) selectedCategories.value = [];
    if (subcategories.length === 0) {
      isOpen.value = false;
      selectedCategories.value = [];
      router.push(`/search?category=${category.id}`);
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
    resetCategories,
  };
}
