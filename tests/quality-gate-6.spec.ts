import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { UserInterface } from '../types/auth/user-interface';
import type { FormSelectOption, SelectInputObject } from '../types/global/form';

import { useFormValidation } from '../composables/formValidation';
import { textUtil } from '../utils/text';
import { useTrimText } from '../composables/text';
import { mapNamesToPath, mapPathArrayOfNames, findCategory, findCategoryByPath } from '../helpers/categories.helper';
import { initializeQuantities, parseProductPriceConfiguration } from '../helpers/prices.helper';
import { getCountryTypeValue, getInputStringValue, isFormSelectOption, resolveFormValue, toInputObject } from '../types/global/form';
import type { CartInterface } from '~/types/cart';
import type { ProductInterface } from '~/types/product';
import type { TaxonomyInterface } from '../types/dashboard/categories';

vi.mock('~/store/categoriesStore', () => ({
  useCategoriesStore: () => ({
    categoriesMap: null,
    updateCategories: () => undefined,
  }),
}));

const sampleProduct = {
  _id: 'product-1',
  name: 'Sample product',
  stock: 42,
  priceHistory: [],
  measure: 'pcs',
  details: {
    SummaryData: {
      Datasheet: '',
      TaxonomyPath: '',
      TaxonomyPathIDs: '',
      SmallImageURL: '',
      PartDescription: '',
      Manufacturer: '',
    },
    ParametricData: {
      Features: [],
    },
    ProductImage: {
      ProductImageSmall: '',
      ProductImageLarge: '',
    },
  },
  sold: 0,
  priceConfiguration: {
    smartLinkId: 'smart-link',
    configuration: [
      { price: 100, quantity: 0 },
      { price: 90, quantity: 10 },
      { price: 80, quantity: 25 },
    ],
  },
  adminSettings: {
    discount: { value: 10, startDate: '', endDate: '' },
  },
} as ProductInterface;

const sampleTaxonomy: TaxonomyInterface[] = [
  {
    id: 'root',
    name: 'Root',
    path: 'root',
    isPublished: true,
    subcategory: [
      {
        id: 'child',
        name: 'Child',
        path: 'root/child',
        isPublished: true,
        subcategory: [
          {
            id: 'leaf',
            name: 'Leaf',
            path: 'root/child/leaf',
            isPublished: true,
          },
        ],
      },
    ],
  },
];

describe('quality gate 6 pure logic coverage', () => {
  describe('text utilities', () => {
    it('slugifies text and trims long labels', () => {
      expect(textUtil.slugify('  Premium Mallorca Villa!  ')).toBe('-premium-mallorca-villa-');
      expect(useTrimText('short label', 20)).toBe('short label');
      expect(useTrimText('this label is much longer than expected', 20)).toBe('this label is muc...');
    });
  });

  describe('form utilities', () => {
    it('resolves raw strings and select values into form strings', () => {
      const selectOption: FormSelectOption = { label: 'Spain', value: 'ES' };
      const selectInput: SelectInputObject = { value: selectOption, error: '' };

      expect(isFormSelectOption(selectOption)).toBe(true);
      expect(resolveFormValue('Mallorca')).toBe('Mallorca');
      expect(resolveFormValue(selectOption)).toBe('ES');
      expect(resolveFormValue(undefined)).toBe('');
      expect(getInputStringValue({ value: selectOption })).toBe('ES');
      expect(getInputStringValue(undefined)).toBe('');
      expect(getCountryTypeValue({ value: selectInput })).toBe('ES');
      expect(toInputObject({ value: 'Palma', error: '', type: 'email' })).toEqual({
        value: 'Palma',
        error: '',
        type: 'email',
      });
      expect(toInputObject({ value: selectOption, error: '' })).toEqual({
        value: selectOption,
        error: '',
      });
    });
  });

  describe('form validation', () => {
    it('validates required values, email-like inputs, and confirmation fields', () => {
      const { checkForInputErrors, checkContactConfirmationEmail, checkProfileConfirmationEmail } = useFormValidation();

      const fields = [
        { value: '', error: '', type: undefined },
        { value: 'not-an-email', error: '', type: 'email' as const },
        { value: 'P-123456', error: '', type: 'email' as const },
      ];

      expect(checkForInputErrors(fields)).toBe(true);
      const [requiredField, invalidEmailField, validClientCodeField] = fields;
      expect(requiredField?.error).toBe('Please fill out this field');
      expect(invalidEmailField?.error).toBe('Please provide a valid email address or a valid client code');
      expect(validClientCodeField?.error).toBe('');

      const contact = {
        email: { value: 'buyer@example.com', error: '' },
        confirmEmail: { value: 'seller@example.com', error: '' },
      };

      expect(checkContactConfirmationEmail(contact)).toBe(true);
      expect(contact.confirmEmail.error).toBe('Confirmation email value should same');

      const profile = {
        accountEmail: { value: 'profile@example.com', error: '' },
        confirmAccountEmail: { value: 'profile@example.com', error: '' },
      };

      expect(checkProfileConfirmationEmail(profile)).toBe(false);
      expect(profile.confirmAccountEmail.error).toBe('');
    });
  });

  describe('price helpers', () => {
    it('calculates discounted configuration prices and initializes quantities from cart data', () => {
      const discountedUser = {
        role: 1,
        verified: true,
        contactDetails: { firstName: '', lastName: '', phone: '', email: '' },
        adminSettings: { discount: { value: 5, startDate: '', endDate: '' } },
      } as UserInterface;

      const priceResult = parseProductPriceConfiguration(sampleProduct, discountedUser, 12);

      expect(priceResult).not.toBeNull();
      expect(priceResult?.priceConfiguration?.price).toBe(90);
      expect(priceResult?.discountPrice).toBe(81);
      expect(priceResult?.currentConfigurationDiscountPrice).toBe(81);
      expect(priceResult?.minimumOrderQuantityConfiguration?.price).toBe(100);

      const exactTierResult = parseProductPriceConfiguration(sampleProduct, discountedUser, 10);
      expect(exactTierResult?.priceConfiguration?.price).toBe(90);
      expect(exactTierResult?.discountPrice).toBe(81);

      const quantity = ref(0);
      const initialRequestedQuantity = ref(0);
      const cart = {
        userId: 'user-1',
        startDate: '',
        endDate: '',
        products: [{ id: 'product-1', stock: 3, backorder_stock: 2, isFolder: false }],
      } as CartInterface;

      initializeQuantities(sampleProduct, cart, quantity, initialRequestedQuantity, { price: 100, quantity: 5 });
      expect(quantity.value).toBe(3);
      expect(initialRequestedQuantity.value).toBe(3);

      const emptyQuantity = ref(0);
      const emptyRequestedQuantity = ref(5);
      initializeQuantities(
        sampleProduct,
        { userId: 'user-1', startDate: '', endDate: '', products: [] },
        emptyQuantity,
        emptyRequestedQuantity,
        { price: 100, quantity: 5 },
      );
      expect(emptyQuantity.value).toBe(0);
      expect(emptyRequestedQuantity.value).toBe(0);

      const absentQuantity = ref(0);
      const absentRequestedQuantity = ref(3);
      initializeQuantities(
        sampleProduct,
        {
          userId: 'user-1',
          startDate: '',
          endDate: '',
          products: [{ id: 'other-product', stock: 2, backorder_stock: 0, isFolder: false }],
        } as CartInterface,
        absentQuantity,
        absentRequestedQuantity,
        { price: 100, quantity: 5 },
      );
      expect(absentQuantity.value).toBe(0);
      expect(absentRequestedQuantity.value).toBe(0);

      expect(() =>
        initializeQuantities(sampleProduct, null, emptyQuantity, emptyRequestedQuantity, { price: 100, quantity: 5 }),
      ).not.toThrow();
      expect(emptyRequestedQuantity.value).toBe(0);
    });
  });

  describe('category helpers', () => {
    it('maps taxonomy paths, ids, and recursive category lookups', () => {
      const categoriesMap = {
        Root: 'root',
        Child: 'child',
        Leaf: 'leaf',
      };

      expect(mapPathArrayOfNames('root/child/leaf', categoriesMap)).toEqual([
        { name: 'Root', id: 'root' },
        { name: 'Child', id: 'child' },
        { name: 'Leaf', id: 'leaf' },
      ]);
      expect(mapNamesToPath(['Root', 'Child', 'Missing', 'Leaf'], categoriesMap)).toBe('root/child/leaf');
      expect(findCategory('leaf', sampleTaxonomy)?.name).toBe('Leaf');
      expect(findCategory('', sampleTaxonomy)).toBeNull();
      expect(findCategory('missing', sampleTaxonomy)).toBeNull();
    });

    it('resolves slug path segments even when taxonomy ids are unrelated to the path', () => {
      const categoriesMap = {
        Semiconductors: '6640cce35fbc8c0fd9f7ed05',
        'Interface ICs': '6640d32a5fbc8c0fd9f7ed1e',
      };

      expect(mapPathArrayOfNames('semiconductors/interface-ics', categoriesMap)).toEqual([
        { name: 'Semiconductors', id: '6640cce35fbc8c0fd9f7ed05' },
        { name: 'Interface ICs', id: '6640d32a5fbc8c0fd9f7ed1e' },
      ]);
      // Legacy id chains still resolve so older links keep working.
      expect(mapPathArrayOfNames('6640cce35fbc8c0fd9f7ed05/6640d32a5fbc8c0fd9f7ed1e', categoriesMap)).toEqual([
        { name: 'Semiconductors', id: '6640cce35fbc8c0fd9f7ed05' },
        { name: 'Interface ICs', id: '6640d32a5fbc8c0fd9f7ed1e' },
      ]);
      expect(mapNamesToPath(['Semiconductors', 'Interface ICs'], categoriesMap)).toBe('semiconductors/interface-ics');
    });

    it('looks up taxonomy nodes by slug path', () => {
      expect(findCategoryByPath('root/child/leaf', sampleTaxonomy)?.name).toBe('Leaf');
      expect(findCategoryByPath('root/child', sampleTaxonomy)?.name).toBe('Child');
      expect(findCategoryByPath('', sampleTaxonomy)).toBeNull();
      expect(findCategoryByPath('root/missing', sampleTaxonomy)).toBeNull();
    });
  });
});
