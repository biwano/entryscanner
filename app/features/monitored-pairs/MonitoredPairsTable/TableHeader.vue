<script setup lang="ts">
import dayjs from "dayjs";

defineProps<{
  lastUpdated?: number;
  userId?: string;
  isAdmin: boolean;
  isSubscribingAll: boolean;
  isUnsubscribingAll: boolean;
}>();

const emit = defineEmits<{
  (e: "subscribeAll" | "unsubscribeAll"): void;
}>();
</script>

<template>
  <div class="flex items-center justify-between">
    <div class="flex flex-col">
      <h2 class="text-xl font-bold">Monitored Pairs</h2>
      <span v-if="lastUpdated" class="text-[10px] text-gray-400 font-medium">
        LAST UPDATE: {{ dayjs(lastUpdated).format("HH:mm:ss") }}
      </span>
    </div>
    <div class="flex items-center gap-2">
      <UButton
        v-if="userId"
        icon="i-lucide-bell"
        size="sm"
        color="primary"
        variant="ghost"
        :loading="isSubscribingAll"
        @click="emit('subscribeAll')"
        >Subscribe All</UButton
      >
      <UButton
        v-if="userId"
        icon="i-lucide-bell-off"
        size="sm"
        color="error"
        variant="ghost"
        :loading="isUnsubscribingAll"
        @click="emit('unsubscribeAll')"
        >Unsubscribe All</UButton
      >
      <UButton
        v-if="isAdmin"
        to="/settings"
        icon="i-lucide-plus"
        size="sm"
        color="neutral"
        variant="ghost"
        >Manage Pairs</UButton
      >
    </div>
  </div>
</template>
