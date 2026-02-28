<template>
  <div class="flex flex-col items-center justify-center py-20 text-center">
    <UIcon name="i-lucide-shield-alert" class="w-16 h-16 text-error mb-4" />
    <h2 class="text-2xl font-bold">Access Denied</h2>
    <p class="text-gray-500 mt-2">You must be an administrator to access this page.</p>
    <UButton to="/" class="mt-6" variant="outline">Return to Dashboard</UButton>
  </div>
</template>
