<template>
  <div class="mt-6 flex flex-col gap-6">
    <div v-if="!order.backorderOption && isMixedOrBackOrder" class="flex flex-row gap-3 items-center">
      <WarningErrorHuge class="w-6 h-5" />
      <span class="text-rose-500 text-sm font-medium leading-6">Select backorder shipping preferences</span>
    </div>
    <template v-if="isMixedOrBackOrder">
      <div
        v-for="backOrderOption in generalSettings?.orderSettings?.backorderShippingTypes"
        :key="backOrderOption._id"
        class="flex flex-col gap-4"
      >
        <div v-if="backOrderOption.active">
          <UiButton
            type="button"
            :aria-pressed="order.backorderOption?._id === backOrderOption._id"
            variant="ghost"
            class="h-auto w-full justify-start items-start whitespace-normal group"
            @click="selectBackorderPreference(backOrderOption)"
          >
            <RadioButtonChecked
              v-if="order.backorderOption?._id === backOrderOption._id"
              class="w-10 sm:w-5 lg:w-10 h-5 my-[3px] text-[#007FFF] group-hover:text-[#007FFF] transition duration-300"
            />
            <RadioButton
              v-else
              class="w-10 sm:w-5 lg:w-10 h-5 my-[3px] text-[#D4D4D4] group-hover:text-[#5E6278] transition duration-300"
            />
            <div class="flex flex-col items-start">
              <h2 class="text-foreground text-sm font-medium leading-6 group-hover:text-[#007FFF] transition duration-300">
                {{ backOrderOption.title }}
              </h2>
              <p class="text-foreground text-sm font-normal leading-6 text-start">
                {{ backOrderOption.description }}
              </p>
            </div>
          </UiButton>
        </div>
      </div>
    </template>

    <div v-if="!shippingPreferences" class="flex flex-col gap-4">
      <span class="text-foreground text-sm font-medium leading-6">No delivery methods available for the current selection</span>
    </div>
    <div v-if="shippingPreferences?.list" class="flex flex-col gap-4">
      <span class="text-foreground text-sm font-medium leading-6">Delivery Method</span>
      <!-- eslint-disable-next-line vue/require-v-for-key -->
      <div v-for="deliveryType in shippingPreferences.list" class="flex flex-col gap-4">
        <div v-if="deliveryType.service">
          <UiButton
            type="button"
            variant="ghost"
            class="h-auto w-full justify-between whitespace-normal group"
            @click="selectDeliveryMethod(deliveryType)"
          >
            <div class="flex flex-row gap-3 items-start">
              <RadioButtonChecked
                v-if="order.deliveryMethod === deliveryType"
                class="w-5 h-5 my-[3px] text-[#007FFF] group-hover:text-[#007FFF] transition duration-300"
              />
              <RadioButton v-else class="w-5 h-5 my-[3px] text-[#D4D4D4] group-hover:text-[#5E6278] transition duration-300" />
              <div class="flex flex-col items-start">
                <h2 class="text-foreground text-sm font-medium leading-6 group-hover:text-[#007FFF] transition duration-300">
                  {{ deliveryType.service.courierName + ' ' }}
                </h2>
                <p class="text-foreground text-sm font-normal leading-6 text-start">
                  {{ deliveryType.service.name }}
                </p>
              </div>
            </div>
            <span class="text-foreground text-sm font-medium leading-6 group-hover:text-[#007FFF] transition duration-300">
              {{ `${deliveryType.price.total} Lei` }}</span
            >
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import WarningErrorHuge from '@/assets/icons/warning-error-huge.svg';
import RadioButton from '@/assets/icons/radio-button.svg';
import RadioButtonChecked from '@/assets/icons/radio-button-checked.svg';
import { DeliveryMethodEnum, OrderType, type CheckoutOrderDraft } from '~~/types';
import type {
  BackorderShippingTypesInterface,
  GeneralSettingsInterface,
  StockorderShippingTypesInterface,
} from '~~/types/general-settings/general-settings';
import type { ShippingOrderPricingOption, ShippingOrderPricingResponse } from '~~/types/order-summary/shipping-services';

export default defineComponent({
  name: 'ShippingPreferencesSection',
  components: {
    WarningErrorHuge,
    RadioButton,
    RadioButtonChecked,
  },
  props: {
    order: {
      type: Object as PropType<CheckoutOrderDraft>,
      required: true,
    },
    generalSettings: {
      type: Object as PropType<GeneralSettingsInterface | null>,
      required: false,
      default: null,
    },
    shippingPreferences: {
      type: Object as PropType<ShippingOrderPricingResponse | null>,
      required: false,
      default: null,
    },
  },
  computed: {
    DeliveryMethodEnum() {
      return DeliveryMethodEnum;
    },
    isMixedOrBackOrder(this: { order: CheckoutOrderDraft }): boolean {
      return this.order.type === OrderType.Back || this.order.type === OrderType.Mixed;
    },
    isStockOrder(this: { order: CheckoutOrderDraft }): boolean {
      return this.order.type === OrderType.Stock;
    },
    isMixedOrStockOrder(this: { order: CheckoutOrderDraft }): boolean {
      return this.order.type === OrderType.Stock || this.order.type === OrderType.Mixed;
    },
  },
  methods: {
    selectBackorderPreference(this: { order: CheckoutOrderDraft }, option: BackorderShippingTypesInterface) {
      if (this.order) {
        // eslint-disable-next-line vue/no-mutating-props
        this.order.backorderOption = option;
      }
    },
    selectStockorderPreference(this: { order: CheckoutOrderDraft }, option: StockorderShippingTypesInterface) {
      if (this.order) {
        // eslint-disable-next-line vue/no-mutating-props
        this.order.stockorderOption = option;
      }
    },
    selectDeliveryMethod(this: { order: CheckoutOrderDraft }, option: ShippingOrderPricingOption) {
      // eslint-disable-next-line vue/no-mutating-props
      this.order.deliveryMethod = option;
    },
  },
});
</script>
