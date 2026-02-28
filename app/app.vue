<script setup lang="ts">
const items = [
  [{
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/'
  }, {
    label: 'Asset Management',
    icon: 'i-lucide-settings',
    to: '/settings'
  }],
  [{
    label: 'Profile',
    icon: 'i-lucide-user',
    to: '/profile'
  }]
]
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-xl font-bold text-primary">Hyperliquid Alert</h1>
            <UNavigationMenu :items="items[0]" orientation="horizontal" class="hidden md:flex" />
          </div>
          <div class="flex items-center gap-4">
            <UColorModeButton />
            <UNavigationMenu :items="items[1]" orientation="horizontal" />
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NuxtPage />
      </main>
      
      <footer class="border-t border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-500">
        &copy; 2026 Hyperliquid Alert. All rights reserved.
      </footer>
    </div>
  </UApp>
</template>
