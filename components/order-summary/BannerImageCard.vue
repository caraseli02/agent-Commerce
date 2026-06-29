<template>
  <div class="flex flex-row gap-[46px] p-9 linear-gradient rounded-xl shadow-xs w-full mb-9">
    <div class="flex flex-col gap-9">
      <div class="flex flex-col gap-6">
        <h2 class="text-[#FFF] text-[32px] font-bold leading-9">October Hot Sale</h2>
        <p class="text-[#FFF] text-base font-normal leading-6 text-">
          Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45
          BC, making it over 2000 years old.
        </p>
      </div>
      <div>
        <button class="px-6 rounded-lg bg-[#F2F2F2]">
          <div class="p-2">
            <span class="text-[#5E6278] text-base font-medium leading-7">View More</span>
          </div>
        </button>
      </div>
    </div>
    <div>
      <NuxtImg
        class="min-w-[280px] min-h-[240px]"
        src="https://s3-alpha-sig.figma.com/img/204b/13fb/8057d3e11618c55f96820cf11d3fa1da?Expires=1702252800&Signature=Pm-s1n6JTrmzgIBACjDwHw-LJTZ4M7zPchLd~8R6msunJflNx~l8NO9Qq8eeAZdlvCpaZ0nof6twvS9GMeiYOCT6MBHanYaxh70B5iOxIY5WeByn8IkWJPFatly74OBRYVtxFU1BgNRblOVafs-rBipuI6k1ZmfHkycsv4HMz83zRJTD63lvBceP1qDZQk4Bc7sw4kCi5EoWlTj3LQvgtRLzB0ObdL~H-Qeejl13xJaUGuXHGuFE7~6MtYRQRoAezzhqyTCe9amFOuSuVi03sLelKu3Ug4vJMUVFNXmsgoDjWgU0Hw~fSfH6CbwgjK3EtLJB12v9MVezSQ9C~UH05Q__&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4" loading="lazy"/>
    </div>
  </div>
</template>

<script lang="ts">
export default defineComponent({
  name: 'BannerImageCard',
});
</script>

<style scoped lang="scss">
.linear-gradient {
  background: linear-gradient(264deg, #418dff 0%, #454dbb 62.59%, #463eab 99.53%);
}
</style>
