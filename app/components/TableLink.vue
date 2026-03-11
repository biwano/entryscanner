<script setup lang="ts">
/**
 * A reusable wrapper for table cell navigation links with a consistent hover state.
 */
defineProps<{
  /** The destination URL for the link */
  to: string;
  /** If true, the link will use inline-block instead of inline-flex */
  block?: boolean;
}>();
</script>

<template>
  <NuxtLink
    :to="to"
    class="-m-1 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
    :class="block ? 'inline-block' : 'inline-flex items-center'"
  >
    <slot />
  </NuxtLink>
</template>
