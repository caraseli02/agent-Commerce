<script setup lang="ts">
defineProps<{
  showGuestBanner: boolean;
}>();
</script>

<template>
  <div class="pt-[30px] lg:pt-10" role="status" aria-live="polite" aria-busy="true">
    <span class="sr-only">Loading your order summary…</span>
    <div aria-hidden="true" class="container px-4">
      <div v-if="showGuestBanner" class="mb-6 mt-4 flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <UiSkeleton class="h-10 w-10 shrink-0 rounded-full" />
        <div class="flex flex-1 flex-col gap-2">
          <UiSkeleton class="h-4 w-40 max-w-full" />
          <UiSkeleton class="h-3 w-full max-w-2xl" />
          <UiSkeleton class="h-3 w-4/5 max-w-xl" />
        </div>
      </div>

      <div class="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-4 shadow-xs md:px-5">
        <UiSkeleton class="h-7 w-40 max-w-[55%]" />
        <div class="flex items-center gap-4">
          <UiSkeleton class="h-6 w-6 rounded-md" />
          <UiSkeleton class="h-6 w-6 rounded-md" />
        </div>
      </div>

      <div class="gap-6 xl:grid xl:grid-cols-[1fr_392px]">
        <section class="mb-6 flex max-w-[992px] flex-col gap-4 xl:mb-0" aria-label="Loading cart items">
          <div v-for="row in 2" :key="`item-${row}`" class="flex gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
            <UiSkeleton class="h-20 w-20 shrink-0 rounded-lg md:h-24 md:w-24" />
            <div class="flex min-w-0 flex-1 flex-col justify-center gap-3">
              <UiSkeleton class="h-4 w-3/4 max-w-sm" />
              <UiSkeleton class="h-3 w-1/2 max-w-xs" />
              <div class="flex items-center justify-between gap-3 pt-1">
                <UiSkeleton class="h-8 w-24 rounded-lg" />
                <UiSkeleton class="h-4 w-20" />
              </div>
            </div>
          </div>
        </section>

        <aside class="flex flex-col gap-4" aria-label="Loading order details">
          <div class="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
            <UiSkeleton class="h-5 w-36" />
            <UiSkeleton class="h-10 w-full rounded-lg" />
            <UiSkeleton class="h-10 w-full rounded-lg" />
          </div>
          <div class="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
            <UiSkeleton class="h-5 w-32" />
            <div class="flex justify-between gap-4">
              <UiSkeleton class="h-4 w-24" />
              <UiSkeleton class="h-4 w-20" />
            </div>
            <div class="flex justify-between gap-4">
              <UiSkeleton class="h-4 w-28" />
              <UiSkeleton class="h-4 w-20" />
            </div>
            <UiSkeleton class="mt-1 h-12 w-full rounded-xl" />
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
