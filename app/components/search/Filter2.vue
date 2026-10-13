<template>
  <div class="flex flex-col bg-white">
    <div class="flex items-center overflow-hidden">
      <div
        v-touch:drag="onDrag"
        class="border border-border flex-shrink-0 rounded-md transition-all duration-300"
        :class="[isSwiped ? 'w-[calc(100%-74px)]' : 'w-full']"
        @touchstart="onTouchStart"
      >
        <UiButton
          variant="ghost"
          class="w-full justify-between px-2.5 text-left"
          :class="[isSwiped ? 'text-gray-500' : '']"
          @click="isSwiped ? null : (showOptions = !showOptions)"
        >
          <div class="text-sm font-medium font-Inter leading-tight truncate">
            Max. forward impulse current
            <span class="text-xs font-normal ml-[5px]">(18945)</span>
          </div>
          <ChevronDownIcon class="w-6 h-6 transition-all duration-300" :class="[showOptions ? 'rotate-180' : '']" />
        </UiButton>
        <div v-if="showOptions" class="flex-1 flex flex-col">
          <div class="pl-2.5 pr-[15px] mb-2.5">
            <div class="flex relative">
              <UiInput v-model="searchValue" type="search" placeholder="Type here" class="h-8 pr-10" />
              <FiltersIcon class="pointer-events-none absolute top-1/2 -translate-y-1/2 right-2.5 w-5 h-5 text-gray-500" />
            </div>
          </div>
          <div class="flex-1 pr-[5px]">
            <div class="grid grid-cols-1 gap-2 flex-1 max-h-[150px] overflow-y-auto scrollbar-thin pb-[13px]">
              <div v-for="option in filteredOptions" :key="options.indexOf(option)" class="flex items-center justify-between px-2.5">
                <UiCheckbox
                  :id="`${optionIdPrefix}-${options.indexOf(option)}`"
                  :checked="option.checked"
                  class="order-last mt-px"
                  @update:checked="option.checked = $event"
                />
                <UiLabel :for="`${optionIdPrefix}-${options.indexOf(option)}`" class="cursor-pointer">
                  {{ option.label }} ({{ option.quantity }})
                </UiLabel>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="max-w-max flex-shrink-0">
        <UiButton variant="secondary" size="icon" class="w-[42px] h-[42px] rounded-full ml-5 mr-[11px]">
          <TrashIcon class="w-5 h-5" />
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TrashIcon from '@/assets/icons/trash-can.svg';
import FiltersIcon from '@/assets/icons/filters.svg';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';

const props = defineProps({
  id: {
    type: Number,
    required: true,
  },
});

const swipedFilter = useState<number | undefined>('swiped-search-filter');

const searchValue = ref('');
// Ids follow the option, not its position: radix copies the label text into aria-label once per id.
const optionIdPrefix = useId();

const showOptions = ref(false);

const options = ref([
  {
    label: 'Micro Comercial Components',
    quantity: 17897,
    checked: false,
  },
  {
    label: 'Manufacturer1',
    quantity: 17897,
    checked: true,
  },
  {
    label: 'Manufacturer2',
    quantity: 17897,
    checked: false,
  },
  {
    label: 'Manufacturer3',
    quantity: 17897,
    checked: true,
  },
  {
    label: 'Manufacturer4',
    quantity: 17897,
    checked: false,
  },
  {
    label: 'Micro Comercial Components',
    quantity: 17897,
    checked: false,
  },
]);

const filteredOptions = computed(() => {
  return options.value.filter((e) => e.label.toLowerCase().includes(searchValue.value.toLowerCase()));
});

const isSwiped = ref(false);
const isSwipping = ref(false);
const swipingTimeout = ref<NodeJS.Timeout>();

const onDrag = (event: { direction?: string }) => {
  if (showOptions.value) {
    return;
  }
  if (event.direction === 'left' || event.direction === 'right') {
    isSwipping.value = true;
    swipedFilter.value = props.id;
  }
  if (event.direction === 'left') {
    isSwiped.value = true;
    swipedFilter.value = props.id;
  } else {
    isSwiped.value = false;
    swipedFilter.value = undefined;
  }

  const timeout = setTimeout(() => {
    isSwipping.value = false;
  }, 100);

  swipingTimeout.value = timeout;
  clearTimeout(swipingTimeout.value);
};

const onTouchStart = (event: TouchEvent) => {
  if (isSwipping.value) {
    event.preventDefault();
  }
};

watch(swipedFilter, (newVal) => {
  if (typeof newVal === 'undefined') {
    isSwiped.value = false;
  } else if (typeof newVal === 'number' && newVal !== props.id) {
    isSwiped.value = false;
  }
});
</script>
