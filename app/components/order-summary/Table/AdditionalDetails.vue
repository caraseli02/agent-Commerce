<template>
  <div class="relative px-4 flex flex-row justify-between xl:justify-start xl:gap-6">
    <!-- Packaging toggle button and details display -->
    <UiButton variant="ghost" size="sm" class="h-auto flex-col xl:flex-row" @click="togglePackagingDetails">
      <PackageBox class="block xl:hidden" />
      <PackageBoxSmall class="hidden xl:block" />
      <span>Packaging</span>
    </UiButton>
    <Transition name="fade-bottom">
      <div
        v-if="showPackagingDetails"
        v-click-outside="togglePackagingDetails"
        class="absolute border-[1px] p-3 xl:bottom-7 bottom-[76px] z-10 max-w-[216px] min-h-[176px] bg-[#FFF] dark:bg-card rounded-xl shadow-l flex flex-col gap-3"
      >
        <h2 class="text-foreground text-sm font-medium leading-6">Packaging Details</h2>
        <p class="text-foreground text-xs font-normal leading-5">
          A tube is a rigid extruded plastic package designed to fit the profile of the part and protect the leads. Tubes ship with the
          exact number of parts ordered and a rubber plug or plastic peg in each end to prevent the parts from sliding out.
        </p>
      </div>
    </Transition>
    <!-- Delivery toggle button and details display -->
    <UiButton variant="ghost" size="sm" class="h-auto flex-col xl:flex-row" @click="toggleDeliveryDetails">
      <DeliveryTruck class="block xl:hidden" />
      <DeliveryTruckSmall class="hidden xl:block" />
      <span>Delivery</span>
    </UiButton>
    <Transition name="fade-bottom">
      <div
        v-if="showDeliveryDetails"
        v-click-outside="toggleDeliveryDetails"
        class="absolute border-[1px] p-3 xl:bottom-7 bottom-[76px] xl:left-12 left-[calc(25%-40px)] z-10 max-w-[240px] min-h-[176px] bg-[#FFF] dark:bg-card rounded-xl shadow-l flex flex-col gap-3"
      >
        <h2 class="text-foreground text-sm font-medium leading-6">Delivery Details</h2>
        <p class="text-foreground text-xs font-normal leading-5">
          Standard delivery time is min. 30 working days. The date needs confirmation. Contact us for enquiry.
        </p>
        <div class="h-[1px] w-full bg-accent rounded-lg" />
        <div class="flex flex-row gap-2">
          <span class="text-foreground text-xs font-normal leading-5">Estimated delivery date</span>
          <span class="text-rose-500 text-xs font-medium leading-5">26/5/2024</span>
        </div>
      </div>
    </Transition>
    <!-- Delete button -->
    <UiButton variant="ghost" size="sm" class="h-auto flex-col xl:hidden" @click="emits('deleteItem')">
      <TrashOutlineBig />
      <span>Delete</span>
    </UiButton>
  </div>
</template>

<script setup lang="ts">
import PackageBox from '@/assets/icons/package-box.svg';
import PackageBoxSmall from '@/assets/icons/package-box-small.svg';
import DeliveryTruck from '@/assets/icons/delivery-truck.svg';
import DeliveryTruckSmall from '@/assets/icons/delivery-truck-small.svg';
import TrashOutlineBig from '@/assets/icons/trash-outline-big.svg';
import type { CartProductsInterface } from '~~/types/cart';

// Define props to receive state from the parent
const props = defineProps<{
  item: CartProductsInterface;
  showPackagingDetails: boolean;
  showDeliveryDetails: boolean;
}>();

const emits = defineEmits(['likeItem', 'deleteItem']);

// Reactive references for internal state if needed
const showPackagingDetails = ref(props.showPackagingDetails);
const showDeliveryDetails = ref(props.showDeliveryDetails);

function togglePackagingDetails() {
  showPackagingDetails.value = !showPackagingDetails.value;
}

function toggleDeliveryDetails() {
  showDeliveryDetails.value = !showDeliveryDetails.value;
}
</script>
