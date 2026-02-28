<script setup lang="ts">
import { computed } from "vue";
import { useSupabaseClient } from "#imports";
import { useAsyncData } from "#app";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { useUser } from "~/composables/useUser";
import { useUserId } from "~/composables/useUserId";
import type { Database } from "~/types/database.types";
import type { UserSubscription, MonitoredPairWithTrends } from "~/types/database.friendly.types";
import MonitoredPairsTable from "~/features/monitored-pairs/MonitoredPairsTable.vue";

const { useAllMids } = useHyperliquid();
const { isAdmin } = useUser();
const { data: allMids } = useAllMids();

const supabase = useSupabaseClient<Database>();
const userId = useUserId();

const { data: monitoredPairs } = await useAsyncData<MonitoredPairWithTrends[] | null>(
  "monitored_pairs",
  async () => {
    const { data } = await supabase
      .from("monitored_pairs")
      .select(
        `
      *,
      last_trend_flip_daily:events!last_trend_flip_daily_id (*),
      last_trend_flip_weekly:events!last_trend_flip_weekly_id (*)
    `
      )
      .eq("active", true)
      .order("last_updated", { ascending: false });
    return data;
  }
);

const { data: userSubscriptions, refresh: refreshSubscriptions } =
  await useAsyncData<UserSubscription[]>("user_subscriptions_dash", async () => {
    if (!userId.value) return [];
    const { data } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId.value);
    return data || [];
  });

const sortedPairs = computed(() => {
  if (!monitoredPairs.value) return [];

  // Sort by how long they have been in their current trend (descending order - most recent first)
  return [...monitoredPairs.value].sort((a, b) => {
    const timeA = new Date(a.last_trend_flip_daily?.timestamp || 0).getTime();
    const timeB = new Date(b.last_trend_flip_daily?.timestamp || 0).getTime();
    return timeB - timeA;
  });
});
</script>

<template>
  <div class="space-y-8">
    <MonitoredPairsTable
      :pairs="sortedPairs"
      :all-mids="allMids || null"
      :is-admin="isAdmin"
      :subscriptions="userSubscriptions || []"
      @refresh-subscriptions="refreshSubscriptions"
    />
  </div>
</template>
