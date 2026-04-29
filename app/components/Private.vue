<script setup lang="ts">
import { useUIStore } from "~/composables/useUIStore";

defineOptions({
  name: "PrivateField",
});

const { isPrivacyMode } = useUIStore();
</script>

<template>
  <template v-if="!isPrivacyMode">
    <slot />
  </template>
  <template v-else> * * * </template>
</template>
