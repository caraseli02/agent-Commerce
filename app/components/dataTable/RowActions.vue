<script setup lang="ts">
import type { Row } from '@tanstack/vue-table';
import { LockKeyholeIcon } from '@lucide/vue';

export interface ActionOptionsConfiguration {
  label: string;
  enable: boolean;
  navigateToRoute?: string;
  actionFn?: string | ((id?: string) => Promise<unknown> | unknown);
  actionParameter?: string;
}

interface RowOriginalWithId {
  _id?: string;
}

interface DataTableRowActionsProps {
  row: Row<RowOriginalWithId>;
  options: ActionOptionsConfiguration[];
  discount?: number;
  lock?: boolean;
}

const props = defineProps<DataTableRowActionsProps>();

const callAction = (option: ActionOptionsConfiguration) => {
  if (!option.actionFn) {
    return undefined;
  }

  const actionArg = option.actionParameter || props.row.original?._id;

  if (typeof option.actionFn === 'function') {
    return option.actionFn(actionArg);
  }

  return undefined;
};
</script>

<template>
  <section class="flex justify-end items-center gap-3">
    <UiBadge v-if="discount" class="h-[22px] text-xs !pt-[3px]" variant="outline"> {{ discount }}% </UiBadge>
    <LockKeyholeIcon v-if="lock" class="w-5 h-5 text-muted-foreground transition-colors duration-300 hover:text-blue-500" />
    <svg
      class="text-muted-foreground hover:text-blue-500 cursor-pointer"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.5 5.83366V14.167C17.5 16.667 16.25 18.3337 13.3333 18.3337H6.66667C3.75 18.3337 2.5 16.667 2.5 14.167V5.83366C2.5 3.33366 3.75 1.66699 6.66667 1.66699H13.3333C16.25 1.66699 17.5 3.33366 17.5 5.83366Z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M12.083 3.75V5.41667C12.083 6.33333 12.833 7.08333 13.7497 7.08333H15.4163"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M6.66699 10.833H10.0003"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M6.66699 14.167H13.3337"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-miterlimit="10"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <svg
      class="text-muted-foreground hover:text-blue-500 cursor-pointer"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 5.00033C2.5 3.15938 3.99238 1.66699 5.83333 1.66699H14.1667C16.0076 1.66699 17.5 3.15938 17.5 5.00033V15.0003C17.5 16.8413 16.0076 18.3337 14.1667 18.3337H5.83333C3.99238 18.3337 2.5 16.8413 2.5 15.0003V5.00033Z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path d="M14.1663 5.83301L5.83301 5.83301" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M14.1663 10L5.83301 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M9.99967 14.167L5.83301 14.167" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <UiDropdownMenu :modal="false">
      <UiDropdownMenuTrigger as-child>
        <UiButton variant="ghost" class="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-ellipsis-vertical h-4 w-4 text-muted-foreground hover:text-blue-500 cursor-pointer"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
          <span class="sr-only">Open menu</span>
        </UiButton>
      </UiDropdownMenuTrigger>
      <UiDropdownMenuContent align="end" class="w-[167px]">
        <template v-for="(option, index) of props.options" :key="index">
          <UiDropdownMenuItem v-if="!option.navigateToRoute" :disabled="!option.enable || !option.actionFn" @click="callAction(option)">
            {{ option.label }}
          </UiDropdownMenuItem>
          <UiDropdownMenuItem v-if="!option.actionFn" :disabled="!option.enable || !option.navigateToRoute">
            <NuxtLink class="w-full h-full" :to="option.navigateToRoute">{{ option.label }}</NuxtLink>
          </UiDropdownMenuItem>
        </template>

        <!--                <UiDropdownMenuItem>Edit</UiDropdownMenuItem> -->
        <!--                <UiDropdownMenuItem>Make a copy</UiDropdownMenuItem> -->
        <!--                <UiDropdownMenuItem>Favorite</UiDropdownMenuItem> -->
        <!--                <UiDropdownMenuItem> Delete</UiDropdownMenuItem> -->
        <!--        <UiDropdownMenuSeparator /> -->
        <!-- <UiDropdownMenuSub>
                <UiDropdownMenuSubTrigger>Labels</UiDropdownMenuSubTrigger>
                <UiDropdownMenuSubContent>
                  <UiDropdownMenuRadioGroup :value="task.label">
                    <UiDropdownMenuRadioItem v-for="label in labels" :key="label.value" :value="label.value">
                      {{ label.label }}
                    </UiDropdownMenuRadioItem>
                  </UiDropdownMenuRadioGroup>
                </UiDropdownMenuSubContent>
              </UiDropdownMenuSub> -->
        <!-- <UiDropdownMenuSeparator /> -->
      </UiDropdownMenuContent>
    </UiDropdownMenu>
  </section>
</template>
