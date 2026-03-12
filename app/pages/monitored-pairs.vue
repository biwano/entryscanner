<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useSupabaseClient, navigateTo } from "#imports";
import { useQuery } from "@tanstack/vue-query";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { useUser } from "~/composables/useUser";
import { useUserId } from "~/composables/useUserId";
import { REFRESH_INTERVAL } from "~~/shared/constants";
import type { Database } from "~/types/database.types";
import type { UserSubscription, MonitoredPairWithTrends } from "~/types/database.friendly.types";
import MonitoredPairsTable from "~/features/monitored-pairs/MonitoredPairsTable/index.vue";

const route = useRoute();
const page = computed({
  get: () => parseInt(route.query.page as string) || 1,
  set: (val: number) => {
    navigateTo({
      path: route.path,
      query: { ...route.query, page: val === 1 ? undefined : val },
    }, { replace: true });
  }
});

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
      v-model:page="page"
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
