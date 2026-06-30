<template>
  <div
    class="absolute z-10 top-0 left-0 flex flex-col w-full h-full bg-white rounded-xl p-4 md:p-6 xl:shadow-none xl:rounded-none xl:row-span-2"
  >
    <div class="mb-4">
      <div class="flex items-start justify-between">
        <h2 class="text-xl leading-[1.4] font-semibold">Customer Credit</h2>
        <button
          class="flex items-center justify-center rounded-lg w-8 h-8 bg-gray-100 text-slate-500 transition-colors duration-300 hover:text-blue-500"
          @click="$emit('toggle-editing')"
        >
          <XIcon class="w-6 h-6" />
        </button>
      </div>
    </div>
    <p class="text-sm leading-[1.71] mb-8">Change to customer credit account.</p>
    <div class="flex flex-col flex-1">
      <div class="grid grid-cols-1 gap-2 mb-8">
        <div class="flex items-center justify-between pb-2 border-b border-gray-200 text-sm leading-[1.42]">
          <span class="text-slate-500"> Credit Limit </span>
          <span class="font-medium">
            {{ (creditObjectToEdit?.limit ? getAmountFormat(creditObjectToEdit.limit) : '0') + ' Lei' }}
          </span>
        </div>
        <div class="flex items-center justify-between pb-2 border-b border-gray-200 text-sm leading-[1.42]">
          <span class="text-slate-500"> Credit Term </span>
          <span class="font-medium"> {{ creditObjectToEdit?.term ? creditObjectToEdit.term + ' days' : '-' }} </span>
        </div>
        <div class="flex items-center justify-between pb-2 border-b border-gray-200 text-sm leading-[1.42]">
          <span class="text-slate-500"> Due Date </span>
          <span class="font-medium"> {{ creditObjectToEdit?.dueDate ? getCurrentDate(creditObjectToEdit?.dueDate) : '-' }} </span>
        </div>
        <div class="flex items-center justify-between pb-2 border-b border-gray-200 text-sm leading-[1.42]">
          <span class="text-slate-500"> Till Due </span>
          <span class="font-medium"> {{ creditObjectToEdit?.tillDue ? creditObjectToEdit.tillDue + ' days' : '-' }} </span>
        </div>
        <div class="flex items-center justify-between pb-2 border-b border-gray-200 text-sm leading-[1.42]">
          <span class="text-slate-500"> Total Spent </span>
          <span class="font-medium">
            {{ (creditObjectToEdit?.spent ? getAmountFormat(creditObjectToEdit.spent) : '0') + ' Lei' }}
          </span>
        </div>
        <div class="flex items-center justify-between text-sm leading-[1.42]">
          <span class="text-slate-500"> Available Credit </span>
          <span class="font-medium text-[#EE514E]">
            {{ (creditObjectToEdit?.available ? getAmountFormat(creditObjectToEdit.available) : '0') + ' Lei' }}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-4 mb-6">
        <button
          class="flex items-center justify-center border-[1.5px] border-[#FA4B4B] rounded-md px-4 py-1 text-rose-500 h-8"
          @click="switchClose()"
        >
          <TrashIcon class="w-4 h-4 mr-2" />
          <span class="text-sm leading-[1.71] font-medium min-w-max"> Close Credit </span>
        </button>
        <button
          class="flex items-center justify-center border-[1.5px] border-blue-500 rounded-md px-4 py-1 text-blue-500 h-8"
          @click="switchFreeze()"
        >
          <FreezeIcon class="w-4 h-4 mr-2" />
          <span class="text-sm leading-[1.71] font-medium min-w-max"> Freeze Credit </span>
        </button>
      </div>
      <div class="mb-6">
        <div class="relative z-10">
          <div class="text-sm text-slate-500 mb-1">Credit Term</div>
          <button
            class="flex items-center justify-between px-3 text-sm w-full border py-[9px] rounded-lg h-11 transition-colors duration-300 focus:outline-none"
            :class="[showCreditTermOptions ? 'border-blue-500' : 'border-border']"
            @click="showCreditTermOptions = !showCreditTermOptions"
          >
            <span
              class="flex items-center text-left truncate"
              :class="{
                'text-slate-500': !creditTerm,
              }"
            >
              <CalendarIcon class="w-6 h-6 text-slate-500 mr-2" />
              <span>
                {{ creditTerm?.label || 'Select Credit Term' }}
              </span>
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="none"
              class="w-5 h-5 text-slate-500 transition-all duration-300"
              :class="[showCreditTermOptions ? 'rotate-180' : '']"
            >
              <path
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="m5.836 8.332 4.167 3.333 4.166-3.333"
              />
            </svg>
          </button>
          <Transition name="fade-full">
            <div
              v-if="showCreditTermOptions"
              v-click-outside="() => (showCreditTermOptions = false)"
              class="grid grid-cols-1 gap-1 absolute -bottom-1 left-0 translate-y-full w-full bg-white rounded-lg overflow-y-auto scrollbar-thin shadow-m p-3 max-h-[250px]"
            >
              <button
                v-for="option in creditTermOptions"
                :key="option.value"
                class="group flex items-center justify-between w-full px-2 py-2 text-left rounded-lg text-sm font-medium leading-[1.71429] transition-colors duration-300 hover:bg-[#F2F2F2] hover:text-blue-500"
                :class="[option.value === creditTerm?.value ? '' : 'text-neutral-700']"
                @click="
                  creditTerm = option;
                  showCreditTermOptions = false;
                "
              >
                <span>
                  {{ option.label }}
                </span>
                <div
                  class="flex items-center justify-center w-[18px] h-[18px] rounded-full border-2 transition-colors duration-300"
                  :class="[option.value === creditTerm?.value ? 'border-blue-500' : 'border-border group-hover:border-dark']"
                >
                  <div v-if="option.value === creditTerm?.value" class="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                </div>
              </button>
            </div>
          </Transition>
        </div>
      </div>
      <div class="mb-10">
        <div class="text-sm text-slate-500 mb-1">Credit Amount</div>
        <div class="flex border border-border rounded-lg h-11 overflow-hidden">
          <input
            v-model="creditAmount"
            type="number"
            placeholder="Discount (i.e. 5, 10, 17)"
            class="bg-transparent px-2 text-sm w-full transition-colors duration-300 focus:outline-none"
          />
          <div class="text-xl leading-[1.3] px-3 py-2 border-r border-border bg-[#F5F5F5]">Lei</div>
        </div>
      </div>
      <div class="grid grid-cols-[auto,1fr] gap-4">
        <button class="flex px-8 py-2 rounded-lg bg-gray-100 leading-[1.75] text-slate-500 font-medium" @click="$emit('cancel')">
          Cancel
        </button>
        <button
          class="flex items-center justify-center px-5 py-2 rounded-lg bg-blue-500 leading-[1.75] text-white font-medium"
          @click="
            $emit('close');
            updateCreditTerm(creditTerm?.value, creditAmount);
          "
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { addDays, format } from 'date-fns';
import XIcon from '@/assets/icons/dashboard/x.svg';
import TrashIcon from '@/assets/icons/dashboard/trash.svg';
import FreezeIcon from '@/assets/icons/dashboard/freeze.svg';
import CalendarIcon from '@/assets/icons/dashboard/calendar.svg';
import type { CustomerCreditInterface } from '~/types/auth/account-settings';
import { useMockMode } from '~/composables/useMockMode';
import {
  fetchCustomerCredit,
  toggleCloseCustomerCredit,
  toggleFreezeCustomerCredit,
  updateCustomerCredit,
} from '~/composables/api/control-panel';

interface CreditTermOption {
  label: string;
  value: number;
}

interface CustomerCreditResponse {
  status: string;
  data: CustomerCreditInterface;
}

interface ApiStatusResponse {
  status: string;
}

defineEmits(['toggle-editing', 'cancel', 'close']);

const creditTerm = ref<CreditTermOption | null>(null);
const creditAmount = ref(0);
const creditObjectToEdit = ref<CustomerCreditInterface>({} as CustomerCreditInterface);
const showCreditTermOptions = ref(false);
const creditTermOptions = ref<CreditTermOption[]>([
  { label: '7 Days', value: 7 },
  { label: '15 Days', value: 15 },
  { label: '30 Days', value: 30 },
  { label: '45 Days', value: 45 },
  { label: '60 Days', value: 60 },
]);
const { isMockMode } = useMockMode();
const props = defineProps<{
  id: string;
}>();

const mockCreditDefaults = (): CustomerCreditInterface => ({
  limit: 12000,
  spent: 3200,
  available: 8800,
  dueDate: new Date().toISOString(),
  tillDue: '30',
  term: 30,
  freeze: false,
  active: true,
});

const applyCreditUpdate = (term?: number, value?: number) => {
  if (value !== undefined) {
    creditObjectToEdit.value.limit = value;
  }
  if (term !== undefined) {
    creditObjectToEdit.value.term = term;
    creditObjectToEdit.value.dueDate = addDays(new Date(), term).toISOString();
    creditObjectToEdit.value.tillDue = String(term);
  }
  creditObjectToEdit.value.available = creditObjectToEdit.value.limit - creditObjectToEdit.value.spent;
};

const getCustomerCredit = async () => {
  if (!props.id) {
    return;
  }
  try {
    const response = (await fetchCustomerCredit(props.id)) as unknown as CustomerCreditResponse;

    if (response.status !== 'success' && !isMockMode.value) {
      return;
    }

    creditObjectToEdit.value = response.status === 'success' ? response.data : mockCreditDefaults();
  } catch (error) {
    console.error('Failed to load customer credit for editing', error);
    if (!isMockMode.value) {
      return;
    }
    creditObjectToEdit.value = mockCreditDefaults();
  }
};

await getCustomerCredit();

const getAmountFormat = (money: number) => {
  return money.toLocaleString('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getCurrentDate = (date: string) => {
  return format(new Date(date), 'dd MMM yyyy');
};

const updateCreditTerm = async (term?: number, value?: number) => {
  if (!term && !value) {
    return;
  }

  if (isMockMode.value) {
    applyCreditUpdate(term, value);
    return;
  }

  if (!props.id) {
    return;
  }

  const response = (await updateCustomerCredit(term ?? 0, String(value ?? 0), props.id)) as ApiStatusResponse;
  if (response.status !== 'success') {
    return;
  }

  applyCreditUpdate(term, value);
};

const switchFreeze = async () => {
  if (!props.id) {
    return;
  }
  if (isMockMode.value) {
    creditObjectToEdit.value.freeze = !creditObjectToEdit.value.freeze;
    return;
  }

  const response = (await toggleFreezeCustomerCredit(props.id)) as ApiStatusResponse;
  if (response.status !== 'success') {
    return;
  }
};

const switchClose = async () => {
  if (!props.id) {
    return;
  }
  if (isMockMode.value) {
    creditObjectToEdit.value.active = !creditObjectToEdit.value.active;
    return;
  }

  const response = (await toggleCloseCustomerCredit(props.id)) as ApiStatusResponse;
  if (response.status !== 'success') {
    return;
  }
};
</script>
