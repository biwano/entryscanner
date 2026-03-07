<script setup lang="ts">
import type { NotificationHistory } from "~/types/database.friendly.types";

// Local type for notifications with joined event
type NotificationWithEvent = NotificationHistory & {
  event: {
    status: string;
  } | null;
};

defineProps<{
  notifications: NotificationWithEvent[];
}>();
</script>

<template>
  <UCard title="Notification History">
    <template #header>
      <h2 class="text-xl font-bold">Notification History</h2>
    </template>
    <div class="space-y-4 max-h-[600px] overflow-y-auto">
      <div
        v-for="notif in notifications"
        :key="notif.id"
        class="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
      >
        <div class="flex justify-between items-start">
          <span class="text-xs text-gray-500">
            <RelativeTime :timestamp="notif.sent_at" />
          </span>
          <UBadge
            :color="
              notif.event?.status === 'bullish' ? 'success' : 'error'
            "
            size="xs"
            variant="subtle"
          >
            {{ notif.event?.status?.toUpperCase() }}
          </UBadge>
        </div>
        <p
          class="mt-2 text-sm font-medium text-gray-900 dark:text-white"
        >
          {{ notif.message }}
        </p>
        <div class="mt-1 text-[10px] text-gray-400 font-mono">
          {{ notif.id }}
        </div>
      </div>

      <div
        v-if="!notifications || notifications.length === 0"
        class="py-10 text-center text-gray-500 text-sm"
      >
        No notifications triggered yet.
      </div>
    </div>
  </UCard>
</template>
