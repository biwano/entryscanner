<script setup lang="ts">
import { computed } from "vue";
import { useSupabaseClient } from "#imports";
import { useQuery } from "@tanstack/vue-query";
import { useHyperliquid } from "~/composables/useHyperliquid.js";
import { useUser } from "~/composables/useUser.js";
import { useUserId } from "~/composables/useUserId.js";
import { REFRESH_INTERVAL } from "~~/shared/constants.js";
import type { Database } from "~/types/database.types.js";
import type { UserSubscription, MonitoredPairWithTrends } from "~/types/database.friendly.types.js";
import MonitoredPairsTable from "~/features/monitored-pairs/MonitoredPairsTable/index.vue";

const { useAllMids } = useHyperliquid();
const { isAdmin } = useUser();
const { data: allMids } = useAllMids();

const supabase = useSupabaseClient<Database>();
const userId = useUserId();

const { data: monitoredPairs, dataUpdatedAt: monitoredPairsUpdatedAt, isLoading } = useQuery({
  queryKey: ["monitored_pairs"],
  queryFn: async () => {
    const { data, error } = await supabase
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

    if (error) throw error;
    return data as MonitoredPairWithTrends[];
  },
  refetchInterval: REFRESH_INTERVAL,
});

const { data: userSubscriptions, refetch: refreshSubscriptions } = useQuery({
  queryKey: ["user_subscriptions", userId],
  queryFn: async () => {
    if (!userId.value) return [];
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId.value);

    if (error) throw error;
    return (data || []) as UserSubscription[];
  },
  enabled: computed(() => !!userId.value),
});
</script>

<template>
  <div class="space-y-8">
    <MonitoredPairsTable
      :pairs="monitoredPairs || []"
      :all-mids="allMids || null"
      :is-admin="isAdmin"
      :subscriptions="userSubscriptions || []"
      :last-updated="monitoredPairsUpdatedAt"
      :loading="isLoading"
      @refresh-subscriptions="refreshSubscriptions"
    />
  </div>
</template>
