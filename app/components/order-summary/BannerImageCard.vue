<template>
  <div class="flex flex-row gap-[46px] rounded-xl border border-border bg-slate-800 p-9 shadow-xs w-full mb-9">
    <div class="flex flex-col gap-9">
      <div class="flex flex-col gap-6">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Volume pricing</p>
        <h2 class="text-white text-[32px] font-bold leading-9">Contract rates on qualified line items</h2>
        <p class="text-slate-300 text-base font-normal leading-6 max-w-xl">
          Review tiered pricing before you submit. Orders above minimum quantity unlock better unit rates on in-stock components.
        </p>
      </div>
      <div>
        <UiButton type="button" variant="secondary" size="lg">
          <div>
            <span>View pricing tiers</span>
          </div>
        </UiButton>
      </div>
    </div>
    <div>
      <img class="min-w-[280px] min-h-[240px] object-contain" :src="HotSaleItem" alt="Electronic component" loading="lazy" />
    </div>
  </div>
</template>

<script setup lang="ts">
import HotSaleItem from '@/assets/media/home/black-friday-item.png';

defineOptions({
  name: 'BannerImageCard',
});
</script>
