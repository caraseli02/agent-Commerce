<template>
    <div class="fixed z-[60] top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
        <div class="relative z-10 w-[358px] max-w-[calc(100vw-32px)] p-4 bg-white rounded-xl pointer-events-auto shadow-xs md:p-6">
            <button
                class="w-8 h-8 bg-gray-100 flex items-center justify-center text-slate-500 rounded-lg ml-auto mb-4 transition-colors duration-300 hover:text-blue-500"
                @click="$emit('close')"
            >
                <XIcon class="w-6 h-6" />
            </button>
            <div v-if="user.active" class="text-sm leading-[2.29] text-center mb-9">Lock account:</div>
            <div v-else class="text-sm leading-[2.29] text-center mb-9">Unlock account:</div>
            <div class="flex items-center mb-[78px]">
                <div
                    class="relative flex items-center justify-center rounded-full overflow-hidden w-11 h-11 flex-shrink-0 mr-4"
                    :class="[!user.avatar ? 'bg-gray-100' : '']"
                >
                    <img v-if="user.avatar" :src="user.avatar" :alt="user.name" class="w-full h-full rounded-full object-cover" />
                    <UserIcon v-else class="w-7 h-7 text-gray-500" />
                </div>
                <div>
                    <div class="flex items-center gap-3 mb-1">
                        <div
                            class="text-sm leading-[1.43] font-semibold truncate transition-colors duration-300 group-hover/link:text-blue-500"
                        >
                            {{ user.name }}
                        </div>
                        <div class="flex items-center gap-3 cursor-default">
                            <img v-if="country && country.label" :src="country.icon" :alt="country.label" class="w-8 rounded mr-2" />
                            <div class="bg-blue-500 px-2 rounded-[25px] text-xs leading-[1.67] font-semibold text-white">10%</div>
                        </div>
                    </div>
                    <div class="text-xs leading-[1.33] text-slate-500 truncate">
                        {{ user.email }}
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-[auto,1fr] gap-4">
                <button
                    class="flex px-8 py-2 rounded-lg bg-gray-100 text-sm leading-[1.71] text-slate-500 font-medium"
                    @click="$emit('close')"
                >
                    Cancel
                </button>
                <button
                    v-if="user.active"
                    class="flex px-5 py-2 rounded-lg bg-rose-500 text-sm leading-[1.71] justify-center text-white font-medium"
                    @click="deactivateAccountAsAdmin(user.firebaseId)"
                >
                    <span>Lock Account</span>
                </button>
                <button
                    v-else
                    class="flex px-5 py-2 rounded-lg bg-[#00D395] text-sm leading-[1.71] justify-center text-white font-medium"
                    @click="activateAccountAsAdmin(user.firebaseId)"
                >
                    <span>Unlock Account</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { DashboardCustomerTableItem } from '~/types';
import type { CountryInterface } from '~/types/dashboard/control-panel';
import XIcon from '@/assets/icons/dashboard/x.svg';
import UserIcon from '@/assets/icons/dashboard/user.svg';
import { activateUser, deactivateUser } from '~/composables/api/dashboard-admin';
import { countries } from '~/data/countries';

const country = ref<CountryInterface | undefined>();

const props = defineProps({
    user: {
        type: Object as PropType<DashboardCustomerTableItem>,
        required: true,
    },
});

const userCountry = async () => {
    if (props.user) {
        country.value = countries.find((c) => c.value === props.user.address?.country) as CountryInterface | undefined;
    }
};
await userCountry();

type ApiStatusResponse = { status: string };

const deactivateAccountAsAdmin = async (id: string) => {
    emits('close');
    emits('changeLockStatus');
    const response = (await deactivateUser(id)) as ApiStatusResponse;

    if (response.status !== 'success') {
        return;
    }
};
const activateAccountAsAdmin = async (id: string) => {
    emits('close');
    emits('changeLockStatus');
    const response = (await activateUser(id)) as ApiStatusResponse;
    if (response.status !== 'success') {
        return;
    }
};

const emits = defineEmits(['close', 'changeLockStatus']);
</script>
