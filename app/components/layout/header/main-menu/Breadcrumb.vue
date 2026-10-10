<script lang="ts" setup>
defineProps<{
  links: string[];
}>();
</script>

<template>
  <UiaBreadcrumb>
    <UiBreadcrumbList>
      <template v-for="link in links" :key="link">
        <UiBreadcrumbItem>
          <UiBreadcrumbLink>
            {{ link }}
          </UiBreadcrumbLink>
        </UiBreadcrumbItem>
        <UiBreadcrumbSeparator v-if="links.length > 1" class="last:hidden" />
      </template>
    </UiBreadcrumbList>
  </UiaBreadcrumb>
</template>
