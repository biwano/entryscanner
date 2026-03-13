<script setup lang="ts">
import { useTraderHook } from "~/composables/useTraderHook";

// Initialize the trader hook globally
const { resume, processTrade } = useTraderHook();
onMounted(() => {
  resume();
  processTrade();
});

useHead({
  title: "Entry scanner",
  titleTemplate: (title) =>
    title === "Entry scanner" ? title : `${title} | Entry scanner`,
  link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
});
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader />

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NuxtPage />
      </main>

      <footer
        class="border-t border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-500"
      >
        &copy; 2026 Entry scanner. All rights reserved.
      </footer>
    </div>
  </UApp>
</template>
