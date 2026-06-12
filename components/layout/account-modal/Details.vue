<template>
    <div class="flex gap-3 w-full px-2">
        <div
            class="aspect-square w-14 shrink-0 my-auto rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-lg font-semibold select-none"
            aria-hidden="true"
        >
            {{ avatarInitials }}
        </div>
        <div class="justify-center items-stretch self-stretch flex grow basis-[0%] flex-col">
            <div class="items-stretch flex justify-start gap-3 pr-5 relative">
                <div class="text-neutral-700 text-sm font-medium leading-5 whitespace-nowrap">
                    {{ fullname || 'Loading...' }}
                </div>
                <DemoTooltip theme="black" position="top">
                    <component :is="getIconBadgeByAccountType()" class="w-5 h-5 hover:text-blue-500" />
                    <template #content>
                        <span class="text-sm">{{
                            getUserDetails.accountType ? AccountType[getUserDetails.accountType] : AccountRole[getUserDetails.role]
                        }}</span>
                    </template>
                </DemoTooltip>
            </div>
            <div class="text-slate-500 text-xs leading-4 whitespace-nowrap mt-1">
                {{ getUserDetails?.contactDetails.email || 'Loading...' }}
            </div>
            <div class="items-center flex gap-2 mt-1 pr-20">
                <div class="text-stone-500 text-xs font-medium leading-5 self-stretch whitespace-nowrap">Client code:</div>
                <div class="text-stone-500 text-xs font-medium leading-5">
                    {{ getUserDetails?.clientCode || 'N/A' }}
                </div>
                <CopyClipboard
                    :text="getUserDetails?._id as string"
                    class="aspect-square object-contain object-center w-4 h-4 overflow-hidden shrink-0 max-w-full my-auto text-[#9A9A9A]"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { shallowRef, type Component } from 'vue';
import { storeToRefs } from 'pinia';
import BuildingIcon from '@/assets/icons/menu/busines-buildings.svg';
import UserIcon from '@/assets/icons/menu/user.svg';
import PersonalCardIcon from '@/assets/icons/menu/personalcard.svg';
import briefcaseIcon from '@/assets/icons/menu/briefcase.svg';
import DemoTooltip from '~/components/global/DemoTooltip.vue';
import { useAuthStore } from '~/store/authStore';
import { AccountRole, AccountType } from '~/types';

const authStore = useAuthStore();

const { getUserDetails } = storeToRefs(authStore);
const accountTypeIcon = shallowRef<Component | null>(null);

onMounted(() => {
    if (!getUserDetails.value) return;

    if (getUserDetails.value.role === AccountRole.Client && getUserDetails.value.accountType === AccountType.Business) {
        accountTypeIcon.value = BuildingIcon;
    } else if (
        getUserDetails.value.role === AccountRole.Client &&
        (getUserDetails.value.accountType === AccountType.SoleTrader || getUserDetails.value.accountType === AccountType.Agent)
    ) {
        accountTypeIcon.value = briefcaseIcon;
    }

    if (getUserDetails.value.role !== AccountRole.Client) {
        accountTypeIcon.value = PersonalCardIcon;
    }
});

const getIconBadgeByAccountType = () => {
    switch (getUserDetails.value?.accountType) {
        case AccountType.Personal:
            return PersonalCardIcon;
        case AccountType.Business:
            return BuildingIcon;
        case AccountType.SoleTrader:
        case AccountType.Agent:
            return briefcaseIcon;
        default:
            return UserIcon;
    }
};

const fullname = computed(() => {
    if (getUserDetails.value?.role === AccountRole.Client && getUserDetails.value?.accountType === AccountType.Personal) {
        // eslint-disable-next-line vue/no-side-effects-in-computed-properties
        accountTypeIcon.value = UserIcon;
        return `${getUserDetails.value?.personalDetails?.firstName} ${getUserDetails.value?.personalDetails?.lastName}`;
    } else {
        return `${getUserDetails.value?.contactDetails?.firstName} ${getUserDetails.value?.contactDetails?.lastName}`;
    }
});

const avatarInitials = computed(() => {
    const sourceName = fullname.value?.trim();

    if (!sourceName) {
        return 'DE';
    }

    const parts = sourceName.split(/\s+/).filter(Boolean);
    return parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('');
});
</script>

<style scoped></style>
