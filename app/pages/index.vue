<script setup lang="ts">
import { useSupabaseClient } from "#imports";
import { useQuery } from "@tanstack/vue-query";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { REFRESH_INTERVAL, TREND_BEARISH } from "~~/shared/constants";
import type { Database, Tables } from "~/types/database.types";
import RecentBearishFlipsTable from "~/features/dashboard/RecentBearishFlipsTable.vue";
import ActiveTrade from "~/features/trading/ActiveTrade.vue";

const { useAllMids } = useHyperliquid();
const { data: allMids } = useAllMids();
const supabase = useSupabaseClient<Database>();

const fetchRecentBearishFlips = async (timeframe: "D1" | "W1") => {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("timeframe", timeframe)
    .eq("status", TREND_BEARISH)
    .order("since", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data as Tables<"events">[];
};

const { data: weeklyBearish, isLoading: isLoadingWeekly } = useQuery({
  queryKey: ["recent_bearish_flips", "W1"],
  queryFn: () => fetchRecentBearishFlips("W1"),
  refetchInterval: REFRESH_INTERVAL,
});

const { data: dailyBearish, isLoading: isLoadingDaily } = useQuery({
  queryKey: ["recent_bearish_flips", "D1"],
  queryFn: () => fetchRecentBearishFlips("D1"),
  refetchInterval: REFRESH_INTERVAL,
});
</script>

<template>
  <div class="space-y-12">
    <ActiveTrade is-dashboard />

    <section>
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          Recent Market Shifts
        </h2>
        <p class="text-gray-500 dark:text-gray-400">
          The latest 5 pairs that flipped to a bearish trend.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentBearishFlipsTable
          title="Last 5 Weekly Bearish Flips"
          :events="weeklyBearish || []"
          :all-mids="allMids || null"
          :loading="isLoadingWeekly"
        />

        <RecentBearishFlipsTable
          title="Last 5 Daily Bearish Flips"
          :events="dailyBearish || []"
          :all-mids="allMids || null"
          :loading="isLoadingDaily"
        />
      </div>
    </section>

    <div class="flex justify-center">
      <UButton
        to="/monitored-pairs"
        color="primary"
        variant="solid"
        icon="i-lucide-activity"
        size="lg"
      >
        View All Monitored Pairs
      </UButton>
    </div>
  </div>
</template>
