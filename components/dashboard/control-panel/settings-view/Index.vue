<template>
  <div class="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-[1fr_460px]">
    <div
      class="relative bg-white grid grid-cols-1 gap-4 overflow-hidden md:min-h-[700px] md:gap-6 lg:grid-cols-2 lg:gap-6 xl:grid-cols-1 xl:gap-0 xl:order-2 xl:grid-rows-[auto_1fr] xl:shadow-xs xl:rounded-xl xl:overflow-hidden"
    >
      <Transition name="slide-from-right">
        <DashboardControlPanelSettingsViewCustomerCreditEdit
          v-if="creditEditing"
          :id="route.params.slug as string"
          @toggle-editing="creditEditing = !creditEditing"
          @cancel="creditEditing = false"
          @close="updateCreditComponent = !updateCreditComponent"
        />
      </Transition>
      <DashboardControlPanelSettingsViewCustomerCredit
        :id="route.params.slug as string"
        :key="Number(updateCreditComponent)"
        @toggle-editing="creditEditing = !creditEditing"
      />
      <DashboardControlPanelSettingsViewCustomerDiscount :id="route.params.slug as string" />
    </div>
    <DashboardControlPanelSettingsViewSettings :id="route.params.slug as string" />
  </div>
</template>

<script setup lang="ts">
import DashboardControlPanelSettingsViewSettings from './Settings.vue';

const route = useRoute();
const creditEditing = ref(false);
const updateCreditComponent = ref(false);
</script>
