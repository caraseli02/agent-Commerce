<template>
  <div class="flex flex-col bg-white">
    <div class="flex items-center overflow-hidden">
      <div
        v-touch:drag="onDrag"
        class="border border-border flex-shrink-0 rounded-md transition-all duration-300"
        :class="[isSwiped ? 'w-[calc(100%-74px)]' : 'w-full']"
        @touchstart="onTouchStart"
      >
        <button
          class="flex items-center justify-between w-full px-2.5 py-[9px] text-left transition-colors duration-300"
          :class="[isSwiped ? 'text-gray-500' : '']"
          @click="isSwiped ? null : (showOptions = !showOptions)"
        >
          <div class="text-sm font-medium font-Inter leading-tight truncate">
            Max. forward impulse current
            <span class="text-xs font-normal ml-[5px]">(18945)</span>
          </div>
          <ChevronDownIcon class="w-6 h-6 transition-all duration-300" :class="[showOptions ? 'rotate-180' : '']" />
        </button>
        <div v-if="showOptions" class="flex-1 flex flex-col">
          <div class="pl-2.5 pr-[15px] mb-2.5">
            <label
              class="flex relative border border-border rounded overflow-hidden transition-colors duration-300 focus-within:border-blue-500"
            >
              <input
                v-model="searchValue"
                type="search"
                placeholder="Type here"
                class="w-full px-2.5 pt-[5px] pb-1.5 pr-10 h-8 text-xs placeholder:text-gray-500 focus:outline-none"
              />
              <FiltersIcon class="absolute top-1/2 -translate-y-1/2 right-2.5 w-5 h-5 text-gray-500" />
            </label>
          </div>
          <div class="flex-1 pr-[5px]">
            <div class="grid grid-cols-1 gap-2 flex-1 max-h-[150px] overflow-y-auto scrollbar-thin pb-[13px]">
              <label
                v-for="(option, index) in filteredOptions"
                :key="index"
                class="group flex items-center justify-between cursor-pointer px-2.5"
              >
                <input v-model="option.checked" type="checkbox" class="sr-only" />
                <span class="text-xs font-Inter transition-colors duration-300 group-hover:text-blue-500">
                  {{ option.label }} ({{ option.quantity }})
                </span>
                <div
                  class="flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded mt-px border transition-colors duration-300"
                  :class="[
                    option.checked
                      ? 'bg-blue-500 border-blue-500 group-hover:bg-white'
                      : 'bg-white  border-border group-hover:border-gray-300',
                  ]"
                >
                  <CheckIcon v-if="option.checked" class="w-4 text-white transition-colors duration-300 group-hover:text-blue-500" />
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
      <div class="max-w-max flex-shrink-0">
        <button class="flex items-center justify-center w-[42px] h-[42px] bg-[#F5F5F5] rounded-full ml-5 mr-[11px]">
          <TrashIcon class="w-5 h-5 text-slate-500" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TrashIcon from '@/assets/icons/trash-can.svg';
import FiltersIcon from '@/assets/icons/filters.svg';
import CheckIcon from '@/assets/icons/check.svg';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';

const props = defineProps({
  id: {
    type: Number,
    required: true,
  },
});

const swipedFilter = useState<number | undefined>('swiped-search-filter');

const searchValue = ref('');

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
