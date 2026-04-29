<script setup lang="ts">
import { useSupabaseClient } from "#imports";
import type { Database } from "~/types/database.types";
import type { UserSubscription } from "~/types/database.friendly.types";

defineProps<{
  subscriptions: UserSubscription[];
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
}>();

const supabase = useSupabaseClient<Database>();

const removeSubscription = async (id: string) => {
  await supabase.from("user_subscriptions")
    .delete()
    .eq("id", id);
  emit("refresh");
};
</script>

<template>
  <UCard title="Active Subscriptions">
    <template #header>
      <h2 class="text-xl font-bold">Active Subscriptions</h2>
    </template>
    <div class="divide-y divide-gray-100 dark:divide-gray-800">
      <div
        v-for="sub in subscriptions"
        :key="sub.id"
        class="flex items-center justify-between py-3"
      >
        <div class="flex items-center gap-3">
          <span class="font-bold">{{ sub.coin }}</span>
          <UBadge size="xs" color="neutral" variant="outline">{{
            sub.timeframe
          }}</UBadge>
        </div>
        <UButton
          size="xs"
          color="error"
          variant="ghost"
          icon="i-lucide-trash"
          @click="removeSubscription(sub.id)"
        />
      </div>
      <div
        v-if="!subscriptions || subscriptions.length === 0"
        class="py-10 text-center text-gray-500 text-sm"
      >
        No active subscriptions. Go to the dashboard to subscribe to
        trend flips.
      </div>
    </div>
  </UCard>
</template>
