<template>
  <div class="container mx-auto flex max-w-2xl flex-col gap-4 py-16 text-center">
    <h1 class="text-2xl font-bold text-zinc-800">Order tracking is available in your account</h1>
    <p class="text-slate-600">To protect customer, delivery, and payment information, tracking details are only shown to the signed-in order owner.</p>
    <NuxtLink to="/?signin=true&redirect=%2Fdashboard%2Forders">
      <UiButton>Sign in to view your orders</UiButton>
    </NuxtLink>
  </div>
</template>
