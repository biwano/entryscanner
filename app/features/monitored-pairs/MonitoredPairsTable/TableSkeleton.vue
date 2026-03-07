<script setup lang="ts">
const props = defineProps<{
  columns: any[];
}>();
</script>

<template>
  <div class="divide-y divide-gray-100 dark:divide-gray-800">
    <!-- Header skeleton -->
    <div
      class="flex items-center gap-4 px-4 py-3 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800"
    >
      <div v-for="col in columns" :key="col.id" class="flex-1 first:flex-[1.5]">
        <USkeleton class="h-4 w-16" />
      </div>
    </div>
    <!-- Row skeletons -->
    <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-4 py-4">
      <div class="flex items-center gap-3 flex-[1.5]">
        <USkeleton class="h-8 w-8 rounded-full" />
        <USkeleton class="h-4 w-20" />
      </div>
      <div class="flex-1">
        <USkeleton class="h-4 w-16" />
      </div>
      <div class="flex-1">
        <USkeleton class="h-6 w-24 rounded-full" />
      </div>
      <div class="flex-1">
        <USkeleton class="h-6 w-24 rounded-full" />
      </div>
      <div class="flex-1">
        <USkeleton class="h-4 w-20" />
      </div>
      <div class="flex-1 flex justify-end gap-2">
        <USkeleton class="h-6 w-6 rounded-md" />
        <USkeleton class="h-6 w-6 rounded-md" />
        <USkeleton class="h-6 w-6 rounded-md" />
      </div>
    </div>
  </div>
</template>
