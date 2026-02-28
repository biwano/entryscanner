<script setup lang="ts">
import { computed } from 'vue'
import { formatRelativeTime } from '#shared/time'
import { format } from 'date-fns'

const props = withDefaults(defineProps<{
  timestamp?: string | number | null
  showAgo?: boolean
}>(), {
  showAgo: true
})

const formattedDate = computed(() => {
  if (!props.timestamp) return ''
  return format(new Date(props.timestamp), 'PPP p')
})
</script>

<template>
  <UTooltip v-if="timestamp" :text="formattedDate">
    <span class="cursor-help">
      {{ formatRelativeTime(timestamp) }}{{ showAgo ? ' ago' : '' }}
    </span>
  </UTooltip>
  <span v-else>N/A</span>
</template>
