<template>
  <div class="flex flex-col gap-6 sm:flex-row sm:gap-8 lg:flex-col lg:gap-6 mt-6 mb-2 justify-between">
    <div class="flex flex-col gap-4 w-full">
      <div class="flex flex-row justify-between">
        <div class="flex flex-row items-center gap-3">
          <span class="text-neutral-700 text-sm font-medium leading-6">Billing Information</span>
          <DemoTooltip v-if="billingInfoMissing" theme="black" position="top">
            <WarningErrorYellow />
            <template #content>
              <span class="capitalize">Missing Info</span>
            </template>
          </DemoTooltip>
          <GreenCheckCircle v-else />
        </div>
        <div class="flex flex-row gap-4">
          <DemoTooltip theme="black" position="top">
            <button>
              <EditSmall
                class="text-[#5E6278] hover:text-[#007FFF] transition duration-150"
                @click="$router.push('/dashboard/client?tab=settings')"
              />
            </button>
            <template #content>
              <span class="capitalize">Edit</span>
            </template>
          </DemoTooltip>
          <DemoTooltip theme="black" position="top">
            <!--                        <button> -->
            <!--                            <SettingCog class="text-[#5E6278] hover:text-[#007FFF] transition duration-150" /> -->
            <!--                        </button> -->
            <!--                        <template #content> -->
            <!--                            <span class="capitalize">Settings</span> -->
            <!--                        </template> -->
          </DemoTooltip>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <p class="text-[#5E6278] text-sm font-medium leading-5">
          {{ order.shippingDetails?.billingAddress?.name1 }}
        </p>
        <p class="text-[#5E6278] text-sm font-medium leading-5">
          {{ order.shippingDetails?.billingAddress?.city }}, {{ order.shippingDetails?.billingAddress?.region }}
        </p>
        <p class="text-[#5E6278] text-sm font-medium leading-5">
          {{ order.shippingDetails?.billingAddress?.postcode }},
          {{ order.shippingDetails?.billingAddress?.country }}
        </p>
      </div>
    </div>
    <div class="flex flex-col gap-4 w-full">
      <div class="flex flex-row justify-between">
        <div class="flex flex-row items-center gap-3">
          <span class="text-neutral-700 text-sm font-medium leading-6">Shipping Information</span>
          <DemoTooltip v-if="shippingInfoMissing" theme="black" position="top">
            <WarningErrorYellow />
            <template #content>
              <span class="capitalize">Missing Info</span>
            </template>
          </DemoTooltip>
          <GreenCheckCircle v-else />
        </div>
        <div class="flex flex-row gap-4">
          <DemoTooltip theme="black" position="top">
            <button>
              <EditSmall
                class="text-[#5E6278] hover:text-[#007FFF] transition duration-150"
                @click="$router.push('/dashboard/client?tab=settings')"
              />
            </button>
            <template #content>
              <span class="capitalize">Edit</span>
            </template>
          </DemoTooltip>
          <DemoTooltip theme="black" position="top">
            <!--                        <button> -->
            <!--                            <SettingCog class="text-[#5E6278] hover:text-[#007FFF] transition duration-150" /> -->
            <!--                        </button> -->
            <!--            <template #content> -->
            <!--              <span class="capitalize">Settings</span> -->
            <!--            </template> -->
          </DemoTooltip>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <div class="flex flex-row justify-between">
          <span class="text-neutral-700 text-sm font-medium leading-6">{{ order.shippingDetails?.address?.alias }}</span>
          <div class="px-2 py-1 rounded-[100px] border-[1px] border-[#00D395] flex items-center justify-center gap-1">
            <CheckCircleSmall />
            <span class="text-[#00D395] text-xs font-medium leading-4">Default</span>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-[#5E6278] text-sm font-medium leading-5">
            {{ order.shippingDetails?.address?.name1 }}
          </p>
          <p class="text-[#5E6278] text-sm font-medium leading-5">
            {{ order.shippingDetails?.address?.city }}, {{ order.shippingDetails?.address?.region }}
          </p>
          <p class="text-[#5E6278] text-sm font-medium leading-5">
            {{ order.shippingDetails?.address?.postcode }}, {{ order.shippingDetails?.address?.country }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import DemoTooltip from '~/components/global/DemoTooltip.vue';
import GreenCheckCircle from '@/assets/icons/green-check-circle.svg';
import EditSmall from '@/assets/icons/edit-small.svg';
import SettingCog from '@/assets/icons/setting-cog.svg';
import CheckCircleSmall from '@/assets/icons/check-circle-small.svg';
import WarningErrorYellow from '@/assets/icons/warning-error-yellow.svg';
import type { CheckoutOrderDraft } from '~/types';

export default defineComponent({
  name: 'ShippingAndBillingSection',
  components: {
    GreenCheckCircle,
    EditSmall,
    // eslint-disable-next-line vue/no-unused-components
    SettingCog,
    CheckCircleSmall,
    WarningErrorYellow,
    DemoTooltip,
  },
  props: {
    order: {
      type: Object as PropType<CheckoutOrderDraft>,
      required: true,
    },
  },
  setup() {
    const router = useRouter();

    return {
      router,
    };
  },
  computed: {
    billingInfoMissing() {
      return (
        !this.order.shippingDetails?.billingAddress?.name1 ||
        !this.order.shippingDetails?.billingAddress?.city ||
        !this.order.shippingDetails?.billingAddress?.region ||
        !this.order.shippingDetails?.billingAddress?.postcode ||
        !this.order.shippingDetails?.billingAddress?.country
      );
    },
    shippingInfoMissing() {
      return (
        !this.order.shippingDetails?.address?.name1 ||
        !this.order.shippingDetails?.address?.city ||
        !this.order.shippingDetails?.address?.region ||
        !this.order.shippingDetails?.address?.postcode ||
        !this.order.shippingDetails?.address?.country
      );
    },
  },
});
</script>
