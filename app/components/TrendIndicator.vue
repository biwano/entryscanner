<script setup lang="ts">
const props = defineProps<{
  status?: 'bullish' | 'bearish'
  since?: string
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="flex items-center gap-1">
      <div v-if="status === 'bullish'" class="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
      <div v-else-if="status === 'bearish'" class="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
      <div v-else class="w-2 h-2 rounded-full bg-gray-400"/>
      
      <span v-if="status" :class="status === 'bullish' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'" class="text-xs font-semibold uppercase tracking-wider">
        {{ status }}
      </span>
      <span v-else class="text-gray-400 text-xs uppercase tracking-wider">
        UNKNOWN
      </span>
    </div>
    
    <span v-if="since" class="text-[10px] text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded border border-gray-200 dark:border-gray-700">
      <RelativeTime :timestamp="since" />
    </span>
  </div>
</template>
