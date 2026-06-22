<template>
  <div
    class="absolute z-10 grid grid-cols-1 gap-1 rounded-lg bg-white p-1 w-[195px] shadow-m -translate-x-full"
    :class="[index > 5 ? '-translate-y-[calc(100%+42px)]' : '']"
    :style="{
      top: dropdownTop + 'px',
      left: dropdownLeft + 'px',
    }"
  >
    <button
      v-if="profileButton"
      class="flex items-center w-full text-left p-2 gap-3 rounded-lg transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
      @click="profileClicked"
    >
      <SvgoDashboardProfile class="w-5 h-5 text-current" />
      <span class="text-sm leading-[1.71] font-medium">{{ profileText }}</span>
    </button>
    <button
      v-if="documentButton"
      class="flex items-center w-full text-left p-2 gap-3 rounded-lg transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
      @click="documentClicked"
    >
      <OrdersIcon class="w-5 h-5 text-current" />
      <span class="text-sm leading-[1.71] font-medium">{{ documentText }}</span>
    </button>
    <button
      v-if="settingsButton"
      class="flex items-center w-full text-left p-2 gap-3 rounded-lg transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
      @click="settingsClicked"
    >
      <SettingsIcon class="w-5 h-5 text-current" />
      <span class="text-sm leading-[1.71] font-medium">{{ settingsText }}</span>
    </button>
    <button
      v-if="deactivateButton"
      class="flex items-center w-full text-left p-2 gap-3 rounded-lg transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
      @click="deactivateClicked"
    >
      <SvgoDashboardDeactivate v-if="profile.active" viewBox="0 0 20 20" class="w-5 h-5 text-current" />
      <UserUnlockIcon v-else class="w-5 h-5 text-current" />
      <span class="text-sm leading-[1.71] font-medium"> {{ deactivateText }} </span>
    </button>
    <button
      v-if="invoiceButton"
      class="flex items-center w-full text-left p-2 gap-3 rounded-lg transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
      @click="invoiceClicked"
    >
      <InvoiceIcon class="w-5 h-5 text-current" />
      <span class="text-sm leading-[1.71] font-medium">{{ invoiceText }}</span>
    </button>
    <button
      v-if="editButton"
      class="flex items-center w-full text-left p-2 gap-3 rounded-lg transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
      @click="editClicked"
    >
      <EditIcon class="w-5 h-5 text-current" />
      <span class="text-sm leading-[1.71] font-medium">{{ editText }}</span>
    </button>
    <button
      v-if="trashButton"
      class="flex items-center w-full text-left p-2 gap-3 rounded-lg text-rose-500 transition-colors duration-300 hover:bg-[#F2F2F2]"
      @click="trashClicked"
    >
      <TrashIcon class="w-5 h-5 text-current" />
      <span class="text-sm leading-[1.71] font-medium"> {{ trashText }} </span>
    </button>
  </div>
</template>

<script lang="ts">
import OrdersIcon from '@/assets/icons/dashboard/document.svg';
import ProfileIcon from '@/assets/icons/dashboard/profile.svg';
import SettingsIcon from '@/assets/icons/dashboard/setting.svg';
import DeactivateIcon from '@/assets/icons/dashboard/deactivate.svg';
import UserUnlockIcon from '@/assets/icons/dashboard/user-unlock.svg';
import TrashIcon from '@/assets/icons/dashboard/trash.svg';
import InvoiceIcon from '@/assets/icons/dashboard/invoice.svg';
import EditIcon from '@/assets/icons/dashboard/edit.svg';

export default defineComponent({
  name: 'ThreeDotMenu',
  components: {
    OrdersIcon,
    // eslint-disable-next-line vue/no-unused-components
    ProfileIcon,
    SettingsIcon,
    // eslint-disable-next-line vue/no-unused-components
    DeactivateIcon,
    UserUnlockIcon,
    TrashIcon,
    InvoiceIcon,
    EditIcon,
  },
  props: [
    // eslint-disable-next-line vue/require-prop-types
    'index',
    // eslint-disable-next-line vue/require-prop-types
    'dropdownTop',
    // eslint-disable-next-line vue/require-prop-types
    'dropdownLeft',
    // eslint-disable-next-line vue/require-prop-types
    'profileButton',
    // eslint-disable-next-line vue/require-prop-types
    'profile',
    // eslint-disable-next-line vue/require-prop-types
    'profileText',
    // eslint-disable-next-line vue/require-prop-types
    'documentButton',
    // eslint-disable-next-line vue/require-prop-types
    'documentText',
    // eslint-disable-next-line vue/require-prop-types
    'settingsButton',
    // eslint-disable-next-line vue/require-prop-types
    'settingsText',
    // eslint-disable-next-line vue/require-prop-types
    'deactivateButton',
    // eslint-disable-next-line vue/require-prop-types
    'deactivateText',
    // eslint-disable-next-line vue/require-prop-types
    'trashButton',
    // eslint-disable-next-line vue/require-prop-types
    'trashText',
    // eslint-disable-next-line vue/require-prop-types
    'invoiceButton',
    // eslint-disable-next-line vue/require-prop-types
    'invoiceText',
    // eslint-disable-next-line vue/require-prop-types
    'editButton',
    // eslint-disable-next-line vue/require-prop-types
    'editText',
    // eslint-disable-next-line vue/require-prop-types
    'active',
  ],
  methods: {
    profileClicked() {
      this.$router.push(`/dashboard/customers/${this.profile.firebaseId}`);
      // eslint-disable-next-line vue/require-explicit-emits
      this.$emit('profileClicked');
    },
    documentClicked() {
      // eslint-disable-next-line vue/require-explicit-emits
      this.$emit('documentClicked');
    },
    settingsClicked() {
      this.$router.push(`/dashboard/customers/${this.profile.firebaseId}/control-panel`);
      // eslint-disable-next-line vue/require-explicit-emits
      this.$emit('settingsClicked');
    },
    deactivateClicked() {
      // eslint-disable-next-line vue/require-explicit-emits
      this.$emit('deactivateClicked');
    },
    trashClicked() {
      // eslint-disable-next-line vue/require-explicit-emits
      this.$emit('trashClicked');
    },
    invoiceClicked() {
      // eslint-disable-next-line vue/require-explicit-emits
      this.$emit('invoiceClicked');
    },
    editClicked() {
      // eslint-disable-next-line vue/require-explicit-emits
      this.$emit('editClicked');
    },
  },
});
</script>
