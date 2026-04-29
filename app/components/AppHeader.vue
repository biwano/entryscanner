<script setup lang="ts">
import { computed } from "vue";
import { useUser } from "~/composables/useUser";
import { useTrading } from "~/composables/useTrading";
import { useUIStore } from "~/composables/useUIStore";
import { useSubAccounts } from "~/composables/useSubAccounts";

type ProfileDropdownItem = {
  label: string;
  icon?: string;
  class?: string;
  to?: string;
  type?: "label";
  onSelect?: () => void;
};

const { isAdmin, user } = useUser();
const { wallet } = useTrading();
const { isPrivacyMode, togglePrivacyMode } = useUIStore();
const { subAccounts, activeSubAccount, setActiveSubAccount } = useSubAccounts();

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

  return baseItems;
});

const switchableSubAccounts = computed(() => {
  const accounts = subAccounts.value ?? [];
  if (accounts.length <= 1) return [];
  return accounts;
});

const profileDropdownItems = computed<ProfileDropdownItem[][]>(() => {
  const items: ProfileDropdownItem[][] = [
    [
      {
        label: "Profile",
        icon: "i-lucide-user",
        to: "/profile",
      },
    ],
  ];

  if (switchableSubAccounts.value.length > 0) {
    items.push([
      {
        label: "Switch account",
        type: "label",
      },
      ...switchableSubAccounts.value.map((account) => ({
        label: account.label,
        icon: "i-lucide-user",
        class:
          activeSubAccount.value?.id === account.id ? "text-primary" : undefined,
        onSelect: () => setActiveSubAccount(account.id),
      })),
    ]);
  }

  return items;
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
        <h1 class="text-xl font-bold text-primary shrink-0">Entry scanner</h1>
        <UNavigationMenu
          :items="menuItems"
          orientation="horizontal"
          class="hidden md:flex"
        />
        <div class="ml-2 flex-grow max-w-xs">
          <GlobalSearch />
        </div>
      </div>
      <div class="flex items-center gap-2">
        <WalletInfo />
        <UButton
          :icon="isPrivacyMode ? 'i-lucide-eye-off' : 'i-lucide-eye'"
          color="neutral"
          variant="ghost"
          @click="togglePrivacyMode"
        />
        <UColorModeButton />
        <UDropdownMenu
          v-if="user"
          :items="profileDropdownItems"
          :content="{ align: 'end' }"
          :ui="{ content: 'w-64' }"
        >
          <UButton
            icon="i-lucide-user"
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-chevron-down"
          >
            Profile
          </UButton>
        </UDropdownMenu>
        <UButton
          v-else
          to="/profile"
          icon="i-lucide-log-in"
          color="neutral"
          variant="ghost"
        >
          Login
        </UButton>
      </div>
    </div>
  </header>
</template>
