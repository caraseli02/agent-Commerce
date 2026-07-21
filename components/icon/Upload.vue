<template>
  <div class="flex items-center space-x-4">
    <!-- SVG Icon Preview -->
    <div v-if="svgPreview" class="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-md">
      <!-- eslint-disable vue/no-v-html -->
      <div v-html="svgPreview" />
    </div>
    <SvgoCardPlaceholderSmall v-else class="w-10 h-10" />

    <!-- Upload Button -->
    <UiButton size="lg" @click="triggerFileUpload"> Upload SVG icon </UiButton>

    <!-- Hidden File Input -->
    <input ref="fileInput" type="file" accept=".svg" class="hidden" @change="handleFileUpload" >
  </div>
</template>

<script setup>
const emit = defineEmits(['update:svgPreview']);

const fileInput = ref(null);
const svgPreview = ref('');
const errorMessage = ref('');

const MAX_FILE_SIZE = 100 * 1024; // 100KB

const triggerFileUpload = () => {
  fileInput.value.click();
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  errorMessage.value = '';

  // Check file type
  if (file && file.type === 'image/svg+xml') {
    // Check file size (MAX_FILE_SIZE is in bytes)
    if (file.size > MAX_FILE_SIZE) {
      errorMessage.value = 'File size exceeds 100KB limit.';
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      let svgContent = e.target.result;

      // Optionally, modify the SVG dimensions to fit within a certain boundary
      svgContent = adjustSvgDimensions(svgContent);

      svgPreview.value = svgContent; // Set the preview to the SVG content
      emit('update:svgPreview', svgPreview.value);
    };

    reader.readAsText(file);
  } else {
    errorMessage.value = 'Please upload a valid SVG file.';
  }
};

// Helper function to modify SVG dimensions if needed
const adjustSvgDimensions = (svgContent) => {
  // Create a temporary DOM element to modify the SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');

  // Set a max width/height to scale down large SVGs (adjust as needed)
  svgElement.setAttribute('width', '20');
  svgElement.setAttribute('height', '20');

  // Serialize the updated SVG back to string
  return new XMLSerializer().serializeToString(doc);
};
</script>

<style scoped>
/* Add custom styling if needed */
</style>
