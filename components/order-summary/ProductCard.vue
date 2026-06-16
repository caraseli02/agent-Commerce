<template>
  <div class="flex flex-col gap-2 rounded-xl bg-[#FFF] shadow-xs w-[304px] h-[282px]">
    <div class="flex flex-row items-start">
      <div
        class="px-2 py-1 flex flex-row gap-2 rounded-br-lg rounded-tl-xl"
        :class="shortStock ? 'bg-[#FF8A00]' : 'bg-[#0FAC7E]'"
      >
        <CheckCircleHollowSmall />
        <span class="text-[#FFF] text-xs font-medium leading-4">{{ item.stock }} in stock</span>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <div class="pl-9 pr-4 flex flex-row">
        <div class="w-[233px] flex items-center justify-center">
          <img
            :src="item.details.ProductImage.ProductImageLarge"
            class="w-[120px] h-[120px]"
          >
        </div>
        <div class="flex flex-col items-start gap-3">
          <button
            class="relative flex group"
            @click="addToFavs"
          >
            <HeartSolidBig
              v-show="liked"
              class="absolute r-0 top-0 fill-[#007FFF] text-[#007FFF]"
            />
            <HeartOutlineBig class="text-[#BDBDBD] group-hover:text-[#007FFF] transition duration-150" />
          </button>
          <button class="flex group">
            <ShareOutline class="text-[#BDBDBD] group-hover:text-[#007FFF] transition duration-150" />
          </button>
          <button class="flex group">
            <BoxIcon class="text-[#BDBDBD] group-hover:text-[#007FFF] transition duration-150" />
          </button>
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1 ml-4">
          <div class="flex flex-row gap-2 items-center max-w-[188px] sm:max-w-[150px] md:max-w-[188px] xl:max-w-[310px]">
            <span class="text-neutral-700 text-base font-semibold leading-6 truncate">{{ item.name }}</span>
            <button class="group">
              <InformationIcon class="text-[#5E6278] group-hover:text-[#007FFF] transition duration-150" />
            </button>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-[#5E6278] text-xs font-semibold">{{ item.details.SummaryData.Manufacturer }}</span>
            <span class="text-[#5E6278] text-xs font-normal truncate max-w-[219px]">{{
              item.details.SummaryData.PartDescription
            }}</span>
          </div>
        </div>
        <div class="ml-4 flex flex-row justify-between items-center">
          <div
            class="flex flex-col py-3 gap-[2px]"
            :class="itemDiscount ? 'pt-0 pb-3' : 'py-3'"
          >
            <span
              v-if="itemDiscount"
              class="text-neutral-700 text-xs font-normal leading-[14px] line-through"
            >RON {{ item.priceRon }} (100+)</span>
            <div
              v-if="itemDiscount"
              class="flex flex-row"
            >
              <span class="text-rose-500 text-base font-bold leading-5">{{ item.priceRon }} Lei</span>
              <span class="text-rose-500 text-xs font-normal leading-5 self-center pl-2">(100+)</span>
            </div>
            <div
              v-else
              class="flex flex-row"
            >
              <span class="text-neutral-700 text-base font-bold leading-6">{{ item.priceRon }} Lei</span>
              <span class="text-neutral-700 text-xs font-normal leading-5 self-center pl-2">(100+)</span>
            </div>
          </div>
          <div>
            <button
              class="flex flex-row items-center justify-center py-3 px-6 bg-[#007FFF] text-[#FFF] rounded-tl-xl rounded-br-xl"
            >
              <CartIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { ProductInterface } from '@/model/products/response/ProductResponse';
import CheckCircleHollowSmall from '@/assets/icons/check-circle-hollow-small.svg';
import HeartOutlineBig from '@/assets/icons/heart-outline-big.svg';
import HeartSolidBig from '@/assets/icons/heart-solid-big.svg';
import ShareOutline from '@/assets/icons/share-outline.svg';
import BoxIcon from '@/assets/icons/box.svg';
import InformationIcon from '~/assets/icons/information.svg';
import CartIcon from '@/assets/icons/cart-huge.svg';

type SimilarProductCard = ProductInterface & {
  priceRon?: number;
};

export default defineComponent({
  name: 'ProductCard',
  components: {
    CheckCircleHollowSmall,
    HeartOutlineBig,
    HeartSolidBig,
    ShareOutline,
    BoxIcon,
    InformationIcon,
    CartIcon,
  },
  props: {
    item: {
      type: Object as PropType<SimilarProductCard>,
      required: true,
    },
  },
  data() {
    return {
      liked: false,
    };
  },
  computed: {
    shortStock() {
      return this.item.stock < 20;
    },
    itemDiscount(): number {
      return this.item.adminSettings?.discount?.value || 0;
    },
  },
  methods: {
    addToFavs() {
      this.liked = !this.liked;
    },
  },
});
</script>
