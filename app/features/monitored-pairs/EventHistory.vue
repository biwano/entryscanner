<script setup lang="ts">
import { TREND_BULLISH } from "#shared/constants.js";
import type { Event } from "~/types/database.friendly.types.js";

defineProps<{
  events: Event[] | null | undefined;
}>();
</script>

<template>
  <UCard title="Event History">
    <div
      v-if="events && events.length > 0"
      class="divide-y divide-gray-100 dark:divide-gray-800 max-h-[400px] overflow-y-auto px-4"
    >
      <div
        v-for="event in events"
        :key="event.id"
        class="py-3 flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <UBadge
            :color="event.timeframe === 'D1' ? 'primary' : 'neutral'"
            variant="subtle"
            size="xs"
          >
            {{ event.timeframe }}
          </UBadge>
          <div class="flex items-center gap-1">
            <UIcon
              :name="
                event.status === TREND_BULLISH
                  ? 'i-lucide-trending-up'
                  : 'i-lucide-trending-down'
              "
              :class="
                event.status === TREND_BULLISH ? 'text-green-500' : 'text-red-500'
              "
            />
            <span
              class="text-xs font-semibold uppercase tracking-wider"
              :class="
                event.status === TREND_BULLISH
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              "
            >
              {{ event.status }}
            </span>
          </div>
        </div>
        <div class="text-[10px] text-gray-500 font-mono">
          <RelativeTime :timestamp="event.since" />
        </div>
      </div>
    </div>
    <div v-else class="text-center py-8 text-gray-500 text-sm italic">
      No events recorded for this asset yet.
    </div>
  </UCard>
</template>
