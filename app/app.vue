<script setup lang="ts">
import { computed } from "vue";
import { useUser } from "~/composables/useUser";
import { usePortfolio } from "~/composables/usePortfolio";

const { isAdmin } = useUser();
const { address } = usePortfolio();

const menuItems = computed(() => {
  const baseItems = [
    {
      label: "Dashboard",
      icon: "i-lucide-layout-dashboard",
      to: "/",
    },
    {
      label: "Monitored Pairs",
      icon: "i-lucide-activity",
      to: "/monitored-pairs",
    },
  ];

  if (address.value) {
    baseItems.push({
      label: "Portfolio",
      icon: "i-lucide-briefcase",
      to: "/portfolio",
    });
  }

  if (isAdmin.value) {
    baseItems.push({
      label: "Asset Management",
      icon: "i-lucide-settings",
      to: "/settings",
    });
  }

  return [
    baseItems,
    [
      {
        label: "Profile",
        icon: "i-lucide-user",
        to: "/profile",
      },
    ],
  ];
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
      <header
        class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50"
      >
        <div
          class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
        >
          <div class="flex items-center gap-4">
            <h1 class="text-xl font-bold text-primary shrink-0">
              Entry scanner
            </h1>
            <UNavigationMenu
              :items="menuItems[0]"
              orientation="horizontal"
              class="hidden md:flex"
            />
            <div class="ml-2 flex-grow max-w-xs">
              <GlobalSearch />
            </div>
          </div>
          <div class="flex items-center gap-4">
            <WalletInfo />
            <UColorModeButton />
            <UNavigationMenu :items="menuItems[1]" orientation="horizontal" />
          </div>
        </div>
      </header>

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
