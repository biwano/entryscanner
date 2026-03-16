<script setup lang="ts">
import { computed } from "vue";
import { useUser } from "~/composables/useUser";
import { useTrading } from "~/composables/useTrading";

const { isAdmin, user } = useUser();
const { wallet } = useTrading();

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

  if (wallet.value) {
    baseItems.push({
      label: "Trading",
      icon: "i-lucide-briefcase",
      to: "/trading",
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
        label: user.value ? "Profile" : "Login",
        icon: user.value ? "i-lucide-user" : "i-lucide-log-in",
        to: "/profile",
      },
    ],
  ];
});
</script>

<template>
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
</template>
