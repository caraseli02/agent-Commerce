<template>
  <div class="items-stretch shadow-xs bg-card flex flex-col p-6 rounded-xl max-md:px-5">
    <div class="text-foreground text-base font-semibold leading-6 max-md:max-w-full">My Activity</div>
    <div class="mt-9 max-md:max-w-full">
      <div class="gap-4 md:gap-5 flex max-md:flex-col max-md:items-stretch">
        <div class="flex flex-col items-stretch w-[33%] min-h-[114px] justify-between max-md:w-full max-md:ml-0">
          <div class="items-start flex justify-between gap-4 grow flex-col">
            <div class="items-stretch flex gap-4 self-start">
              <div
                class="justify-center items-center bg-red-500 bg-opacity-30 flex aspect-square flex-col p-2 w-13 h-13 md:w-11 md:h-11 md:p-1 lg:w-14 lg:h-14 lg:p-2 rounded-[100px] self-start"
              >
                <div class="justify-center items-center bg-red-500 flex aspect-square flex-col w-full h-9 lg:h-10 px-2 rounded-[100px]">
                  <svg
                    class="w-5 h-5 lg:w-6 lg:h-6 aspect-square object-contain object-center overflow-hidden"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12.765 4.70229L12 5.52422L11.235 4.70229C9.12233 2.43257 5.69709 2.43257 3.58447 4.70229C1.47184 6.972 1.47184 10.6519 3.58447 12.9217L10.4699 20.3191C11.315 21.227 12.685 21.227 13.5301 20.3191L20.4155 12.9217C22.5282 10.6519 22.5282 6.972 20.4155 4.70229C18.3029 2.43257 14.8777 2.43257 12.765 4.70229Z"
                      stroke="white"
                      stroke-width="1.5"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <div class="items-stretch flex grow basis-[0%] flex-col text-sm whitespace-nowrap">
                <div class="text-foreground font-semibold leading-5">My Favorites</div>
                <template v-if="hasFavorites">
                  <div v-for="(val, key, index) in data.favorites" :key="index" class="items-stretch flex justify-between gap-3 mt-0.5">
                    <div class="text-muted-foreground leading-6 capitalize">
                      {{ key }}
                    </div>
                    <div class="text-foreground font-medium leading-6">
                      {{ val }}
                    </div>
                  </div>
                </template>
                <GlobalEmptyState
                  v-else
                  v-bind="favoritesEmptyPreset"
                  compact
                  class="!items-start !text-left"
                  heading-id="dashboard-favorites-empty-heading"
                  @primary-click="openFavoritesBrowse"
                />
              </div>
            </div>
            <div
              v-if="hasFavorites"
              class="items-stretch flex gap-2 self-end text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <UiButton variant="ghost" class="h-auto p-0 text-sm font-medium leading-5 grow">Favorites</UiButton>
              <SvgoArrowLeft16
                class="aspect-square object-contain object-center w-4 justify-center items-center overflow-hidden shrink-0 max-w-full my-auto"
              />
            </div>
          </div>
        </div>
        <div class="h-0.5 w-full md:h-[114px] md:w-[2px] bg-accent" />
        <div class="flex flex-col items-stretch w-[33%] min-h-[114px] justify-between lg:ml-5 max-md:w-full max-md:ml-0">
          <div class="justify-between items-stretch self-stretch flex grow flex-col">
            <div class="items-stretch flex justify-between gap-4">
              <div
                class="justify-center items-center bg-primary bg-opacity-30 flex aspect-square flex-col p-2 w-13 h-13 md:w-11 md:h-11 md:p-1 lg:w-14 lg:h-14 lg:p-2 rounded-[100px]"
              >
                <div class="justify-center items-center bg-primary flex aspect-square flex-col w-full h-9 lg:h-10 px-2 rounded-[100px]">
                  <svg
                    class="w-5 h-5 lg:w-6 lg:h-6 aspect-square object-contain object-center justify-center items-center overflow-hidden"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 7V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V7C3 4 4.5 2 8 2H16C19.5 2 21 4 21 7Z"
                      stroke="white"
                      stroke-width="1.5"
                      stroke-miterlimit="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M14.5 4.5V6.5C14.5 7.6 15.4 8.5 16.5 8.5H18.5"
                      stroke="white"
                      stroke-width="1.5"
                      stroke-miterlimit="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M8 13H12"
                      stroke="white"
                      stroke-width="1.5"
                      stroke-miterlimit="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M8 17H16"
                      stroke="white"
                      stroke-width="1.5"
                      stroke-miterlimit="10"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <div class="items-stretch flex grow basis-[0%] flex-col text-sm self-start">
                <div class="items-stretch flex gap-2 font-semibold self-start">
                  <div class="text-foreground leading-5 grow">Total Orders</div>
                  <div class="text-foreground leading-5">
                    {{ data.totalOrders }}
                  </div>
                </div>
                <div class="text-muted-foreground leading-6 mt-0.5">
                  This month you have placed
                  <span class="font-semibold text-foreground">{{ data.monthOrder }}</span> orders.
                </div>
              </div>
            </div>
            <div class="items-stretch flex gap-2 self-end text-muted-foreground hover:text-primary cursor-pointer">
              <UiButton variant="ghost" size="xs" class="text-sm font-medium leading-5 gap-2" @click="openSettingTab">
                Orders
                <SvgoArrowLeft16
                  class="aspect-square object-contain object-center w-4 justify-center items-center overflow-hidden shrink-0 max-w-full my-auto"
                />
              </UiButton>
            </div>
          </div>
        </div>
        <div class="h-0.5 w-full md:h-[114px] md:w-[2px] bg-accent" />
        <div class="flex flex-col items-stretch w-[33%] min-h-[114px] justify-between lg:ml-5 max-md:w-full max-md:ml-0">
          <div class="justify-between items-stretch self-stretch flex grow flex-col">
            <div class="items-stretch flex gap-4">
              <div
                class="justify-center items-center bg-slate-500 bg-opacity-30 flex aspect-square flex-col p-2 w-13 h-13 md:w-11 md:h-11 md:p-1 lg:w-14 lg:h-14 lg:p-2 rounded-[100px]"
              >
                <div class="justify-center items-center bg-slate-500 flex aspect-square flex-col w-full h-9 lg:h-10 px-2 rounded-[100px]">
                  <svg
                    class="aspect-square object-contain object-center overflow-hidden w-5 h-5 lg:w-6 lg:h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 8L15 8C17.2091 8 19 9.79086 19 12C19 14.2091 17.2091 16 15 16L5 16M5 8L9 5M5 8L9 11"
                      stroke="white"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <div class="items-stretch flex grow basis-[0%] flex-col">
                <div class="items-stretch flex gap-2 text-sm font-semibold whitespace-nowrap">
                  <div class="text-foreground leading-5 shrink basis-auto">Returns</div>
                  <div class="text-foreground leading-5">
                    {{ data.returns }}
                  </div>
                </div>
                <div class="items-stretch flex gap-2 mt-4">
                  <svg
                    class="aspect-square object-contain object-center w-4 overflow-hidden shrink-0 max-w-full my-auto"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3.3335 5.3335L10.0002 5.3335C11.4729 5.3335 12.6668 6.5274 12.6668 8.00016C12.6668 9.47292 11.4729 10.6668 10.0002 10.6668L3.3335 10.6668M3.3335 5.3335L6.00016 3.3335M3.3335 5.3335L6.00016 7.3335"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <div class="text-muted-foreground text-sm leading-5">File a return</div>
                </div>
              </div>
            </div>
            <div class="items-stretch flex gap-2 self-end text-muted-foreground hover:text-primary cursor-pointer">
              <UiButton variant="ghost" class="h-auto p-0 text-sm font-medium leading-5 grow whitespace-nowrap">All Returns</UiButton>
              <SvgoArrowLeft16
                class="aspect-square object-contain object-center w-4 justify-center items-center overflow-hidden shrink-0 max-w-full my-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import GlobalEmptyState from '~/components/global/EmptyState.vue';
import type { CustomerDashboardActivityData } from '~~/types/dashboard/client-dashboard';
import { favoritesEmptyPreset } from '~/components/global/empty-state-presets';

const props = defineProps<{
  data: CustomerDashboardActivityData;
}>();

const router = useRouter();
const { activeOrderFilter } = useCustomerDashboard();

const hasFavorites = computed(() => props.data.favorites.products > 0 || props.data.favorites.folders > 0);

const openSettingTab = () => {
  activeOrderFilter.value = {
    value: 'orders',
  };
};

const openFavoritesBrowse = async () => {
  await router.push('/search');
};
</script>

<style scoped></style>
