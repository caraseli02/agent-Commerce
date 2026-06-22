<script lang="ts" setup>
import { onMounted } from 'vue';
import { useZoomImageWheel } from '@zoom-image/vue';

defineProps<{
  url: string;
}>();

const imageWheelContainerRef = ref<HTMLDivElement>();
const { createZoomImage } = useZoomImageWheel();

onMounted(() => {
  if (imageWheelContainerRef.value) {
    createZoomImage(imageWheelContainerRef.value);
  }
});
</script>

<template>
  <div ref="imageWheelContainerRef" class="imageContainer">
    <img class="image" alt="Large Pic" :src="url" />
  </div>
</template>

<style>
.imageContainer {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.image {
  max-width: 100%;
  max-height: 100%;
}
</style>

<!-- <template>
  <div>

  </div>
</template>

<script setup lang="ts">
import { useZoomImageClick , useZoomImageWheel } from "@zoom-image/vue"

const {
  createZoomImage: createZoomImageWheel,
  zoomImageState: zoomImageWheelState,
  setZoomImageState: setZoomImageWheelState,
} = useZoomImageWheel()
const { createZoomImage: createZoomImageClick } = useZoomImageClick()

const imageWheelContainerRef = ref<HTMLDivElement>()
const imageMoveContainerRef = ref<HTMLDivElement>()
const imageClickContainerRef = ref<HTMLDivElement>()
const zoomTargetRef = ref<HTMLDivElement>()

const zoomIn = () => {
  setZoomImageWheelState({
    currentZoom: zoomImageWheelState.currentZoom + 0.5,
  })
}
const zoomOut = () => {
  setZoomImageWheelState({
    currentZoom: zoomImageWheelState.currentZoom - 0.5,
  })
}

const zoomType = computed(() => {
  const found = tabs.value.find((tab) => tab.current)
  return found?.value as "hover" | "wheel" | "move" | "click"
})

watch(
  zoomType,
  async () => {
    croppedImage.value = ""
    await nextTick()

    if (zoomType.value === "wheel") {
      createZoomImageWheel(imageWheelContainerRef.value as HTMLDivElement)
    }

    if (zoomType.value === "move") {
      createZoomImageMove(imageMoveContainerRef.value as HTMLDivElement, {
        zoomImageSource: "/sample.avif",
      })
    }

    if (zoomType.value === "click") {
      createZoomImageClick(imageClickContainerRef.value as HTMLDivElement, {
        zoomImageSource: "/sample.avif",
      })
    }
  },
  { immediate: true },
)
</script>

<style scoped>

</style> -->
