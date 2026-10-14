<template>
  <div class="bg-white rounded-xl p-4 shadow-xs md:p-6 w-full lg:w-[622px] xl:w-[684px] max-h-[592px] md:h-[474px]">
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center justify-between">
        <div class="font-semibold md:leading-[1.2]">Account Information</div>
      </div>
      <SvgoDashboardWarning v-if="error" class="w-6 h-6" />
      <div v-else class="relative">
        <UiButton variant="ghost" size="icon" class="flex h-auto w-auto hover:bg-transparent" @click="showOptions = !showOptions">
          <SvgoDotsVertical class="w-6 h-6 text-[#9296AA] transition-colors duration-300 hover:text-blue-500" />
        </UiButton>
        <Transition name="fade-bottom">
          <ThreeDotMenu
            v-if="showOptions"
            v-click-outside="() => (showOptions = false)"
            :index="index"
            :profile="customerDetails"
            :dropdown-top="30"
            :dropdown-left="25"
            :deactivate-button="true"
            :deactivate-text="customerDetails.active ? 'Lock Account' : 'Unlock Account'"
            :trash-button="true"
            :trash-text="'Delete Account'"
            @settings-clicked="showOptions = false"
            @deactivate-clicked="
              showDeactivatingModal = true;
              showOptions = false;
            "
          />
        </Transition>
        <Teleport to="body">
          <DashboardDeactivateUserModal
            v-if="showDeactivatingModal"
            :user="customerDetails"
            @close="showDeactivatingModal = false"
            @change-lock-status="customerDetails.active = !customerDetails.active"
          />
        </Teleport>
      </div>
    </div>
    <div v-if="emptyData || error" class="flex flex-col w-full h-[80%] items-center justify-center flex-1">
      <SvgoDashboardEmojiSad class="w-[52px] h-[52px] mb-4" />
      <div class="text-sm font-medium text-slate-500">No data available</div>
    </div>
    <template v-else>
      <div class="flex items-start md:items-center" :class="[isLoading ? 'mb-3' : 'mb-5']">
        <SkeletonLoader v-if="isLoading" type="circle" class="w-16 h-16 mr-4" />
        <img v-else :src="Avatar" alt="Name" class="w-16 h-16 flex-shrink-0 rounded-full object-cover mr-4" loading="lazy" />
        <div class="flex flex-col md:grid md:grid-cols-[repeat(2,auto)] md:justify-between md:flex-1">
          <SkeletonLoader v-if="isLoading" class="w-[140px] h-5 mb-2" />
          <div v-else class="flex md:flex-row-reverse">
            <div class="font-semibold leading-tight mb-2 md:order-1">
              {{ firstName + ' ' + lastName }}
            </div>
            <DemoTooltip theme="black" :position="'top'" class="self-start ml-3">
              <LockKeyholeIcon
                v-if="customerInformation.status === AccountStatusEnum.Inactive"
                class="w-4 h-4 text-slate-500 transition-colors duration-300 hover:text-blue-500"
              />
              <template #content>
                <span class="capitalize">Account Locked</span>
              </template>
            </DemoTooltip>
          </div>
          <SkeletonLoader v-if="isLoading" class="w-[160px] h-5 mb-2 md:w-[180px]" />
          <div v-else class="flex items-center text-sm mb-2 md:order-3 md:mb-0">
            <span class="text-slate-500 mr-2">Account Type:</span>
            <span class="font-medium">{{ AccountType[customerInformation.accountType as unknown as keyof typeof AccountType] }}</span>
          </div>
          <SkeletonLoader v-if="isLoading" class="w-[180px] h-5 mb-2" />
          <div v-else class="text-sm font-medium text-blue-500 mb-2 md:order-4 md:mb-0">
            {{ customerInformation?.companyDetails?.name }}
          </div>
          <SkeletonLoader v-if="isLoading" class="w-[180px] h-5" />
          <div v-else class="flex items-center text-sm md:order-2 md:mb-2">
            <span class="text-slate-500 mr-2">Last Active:</span>
            <span class="font-medium">{{ customerInformation.lastActivityDate || '-' }}</span>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <div class="pb-3 border-b border-gray-200 mb-3">
          <SkeletonLoader v-if="isLoading" class="w-full h-[304px] md:h-[232px]" />
          <template v-else>
            <div class="flex flex-row gap-3">
              <div class="text-sm font-semibold mb-4">Account Details</div>
              <!--              <Tooltip -->
              <!--                  v-if="customerInformation.adminSettings?.discount" -->
              <!--                  :position="index === 0 ? 'bottom' : 'top'" -->
              <!--                  theme="black" -->
              <!--              > -->
              <!--                <div -->
              <!--                    class="border-[#007FFF] border-[1px] px-2 rounded-[50px] text-xs leading-[20px] font-semibold text-[#007FFF]" -->
              <!--                > -->
              <!--                  {{ customerInformation.adminSettings?.discount?.value }} % -->
              <!--                </div> -->
              <!--                <template #content> -->
              <!--                                    <span -->
              <!--                                    >Customer Discount: -->
              <!--                                        <strong class="font-semibold">{{ -->
              <!--                                            `${customerInformation.adminSettings?.discount?.value}%` -->
              <!--                                          }}</strong></span -->
              <!--                                    > -->
              <!--                </template> -->
              <!--              </Tooltip> -->
            </div>
            <div class="grid grid-cols-1 gap-2">
              <div class="grid grid-cols-[140px_1fr] gap-3">
                <div class="text-sm text-slate-500 leading-[1.75]">User Name</div>
                <div class="text-sm font-medium leading-[1.75] break-all">
                  {{
                    customerInformation.accountType === AccountType.Personal
                      ? customerInformation.profileDetails?.email
                      : customerInformation.contactDetails?.email
                  }}
                </div>
              </div>
              <div class="grid grid-cols-[140px_1fr] gap-3">
                <div class="text-sm text-slate-500 leading-[1.75]">Name</div>
                <div class="text-sm font-medium leading-[1.75] break-all">
                  {{ firstName }}
                </div>
              </div>
              <div class="grid grid-cols-[140px_1fr] gap-3">
                <div class="text-sm text-slate-500 leading-[1.75]">Surname</div>
                <div class="text-sm font-medium leading-[1.75] break-all">
                  {{ lastName }}
                </div>
              </div>
              <div class="grid grid-cols-[140px_1fr] gap-3">
                <div class="text-sm text-slate-500 leading-[1.75]">Country</div>
                <div class="flex items-center text-sm font-medium leading-[1.75] break-all">
                  <img v-if="country && country.label" :src="country.icon" :alt="country.label" class="w-8 rounded mr-2" loading="lazy" />
                  <span>{{ country?.label ? country.label : 'N/A' }} </span>
                </div>
              </div>
              <div class="grid grid-cols-[140px_1fr] gap-3">
                <div class="text-sm text-slate-500 leading-[1.75]">Mobile Number</div>
                <div class="text-sm font-medium leading-[1.75] break-all">
                  {{ customerInformation?.contactDetails?.phone }}
                </div>
              </div>
              <div class="grid grid-cols-[140px_1fr] gap-3">
                <div class="text-sm text-slate-500 leading-[1.75]">Address</div>
                <div class="text-sm font-medium leading-[1.75] break-all">
                  {{ customerInformation?.personalDetails?.address.name1 || 'N/A' }}
                </div>
              </div>
            </div>
          </template>
        </div>
        <div class="flex items-start justify-between gap-5">
          <SkeletonLoader v-if="isLoading" class="w-[120px] h-10 md:w-[160px] md:h-[18px]" />
          <div v-else class="md:flex md:items-center">
            <div class="flex items-center mb-1 md:mb-0">
              <div class="w-2 h-2 rounded-full bg-green-500 mr-2" />
              <span class="text-sm font-medium leading-tight text-slate-500">Registered</span>
            </div>
            <div class="text-sm font-medium leading-tight pl-4">
              {{ formatReviewerDateTime(customerInformation.createdAt) }}
            </div>
          </div>
          <SkeletonLoader v-if="isLoading" class="w-[120px] h-10 md:w-[160px] md:h-[18px]" />
          <div v-else class="md:flex md:items-center">
            <div class="flex items-center mb-1 md:mb-0">
              <div class="w-2 h-2 rounded-full bg-blue-500 mr-2" />
              <span class="text-sm font-medium leading-tight text-slate-500">Email Marketing</span>
            </div>
            <div class="text-sm font-medium leading-tight pl-4">
              {{ customerInformation.adminSettings?.marketingPreferences?.emailMarketing?.email ? 'Subscribed' : 'Not Subscribed' }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatReviewerDate, formatReviewerDateTime } from '~~/helpers/reviewer-dates';
import Emitter from 'tiny-emitter/instance.js';
import { LockKeyholeIcon } from '@lucide/vue';
import Avatar from '@/assets/icons/dashboard/avatar.png';
import { AccountStatusEnum, type AddressInterface, type UserInterface } from '~~/types/auth/user-interface';
import { AccountRole, AccountType, getAccountTypeById } from '~~/types';
import type { DashboardCustomerTableItem } from '~~/types';
import ThreeDotMenu from '~/components/shared/tables/micro/row-items/ThreeDotMenu.vue';
import DemoTooltip from '~/components/global/DemoTooltip.vue';
import { useCountries } from '~/composables/useCountries';
import type { CountryInterface } from '~~/types/dashboard/control-panel';

const { countries, load: loadCountries } = useCountries();

type CustomerProfileUser = UserInterface & { lastActivityDate?: string };

const showOptions = ref(false);
const showDeactivatingModal = ref(false);

const error = ref(false);
const emptyData = ref(false);
const isLoading = ref(false);
const country = ref<CountryInterface | null>(null);
const address = ref<AddressInterface | undefined>(undefined);
const props = withDefaults(
  defineProps<{
    id: string;
    accountInformation: CustomerProfileUser;
    index?: number;
  }>(),
  {
    index: 0,
  },
);
const customerInformation = ref<CustomerProfileUser>({} as CustomerProfileUser);
const customerDetails = ref<DashboardCustomerTableItem>({} as DashboardCustomerTableItem);

const fetchInformation = async () => {
  error.value = false;
  isLoading.value = true;

  if (props.accountInformation && props.accountInformation.contactDetails) {
    customerInformation.value = props.accountInformation;
    address.value =
      customerInformation.value.accountType === 0
        ? customerInformation.value.personalDetails?.address
        : customerInformation.value.companyDetails?.address;

    if (address.value?.country) {
      await loadCountries();
      country.value = (countries.value.find((c) => c.value === address.value?.country) ?? null) as CountryInterface | null;
    }

    Emitter.emit('customer-info', {
      name: customerInformation.value.contactDetails?.firstName + ' ' + customerInformation.value.contactDetails?.lastName,
    });

    customerDetails.value = {
      id: customerInformation.value?._id || '',
      avatar: Avatar,
      name: `${customerInformation.value?.contactDetails?.firstName} ${customerInformation.value?.contactDetails?.lastName} `,
      email: customerInformation.value?.profileDetails?.email || 'N/A',
      account: getAccountTypeById(customerInformation.value.accountType as number) || '-',
      company: customerInformation.value?.companyDetails?.name || '-',
      registered: formatReviewerDate(customerInformation.value.createdAt),
      spent: customerInformation.value?.spent || 0,
      ordersCount: customerInformation.value?.ordersCount || 0,
      firebaseId: customerInformation.value?.firebaseId || 'N/A',
      active: customerInformation.value?.status === AccountStatusEnum.Active,
      address: address.value ?? ({} as AddressInterface),
      flag: country.value ?? ({} as CountryInterface),
    };

    isLoading.value = false;
    error.value = false;
  } else {
    isLoading.value = false;
    error.value = true;
  }
};

await fetchInformation();

const firstName = computed(() => {
  if (customerInformation.value.role === AccountRole.Client && customerInformation.value.accountType === AccountType.Personal) {
    return customerInformation.value?.personalDetails?.firstName;
  }
  return customerInformation.value?.contactDetails?.firstName;
});

const lastName = computed(() => {
  if (customerInformation.value.role === AccountRole.Client && customerInformation.value.accountType === AccountType.Personal) {
    return customerInformation.value?.personalDetails?.lastName;
  }
  return customerInformation.value?.contactDetails?.lastName;
});
</script>
