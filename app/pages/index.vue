<script setup lang="ts">
import { useSupabaseClient } from "#imports";
import { useQuery } from "@tanstack/vue-query";
import { useHyperliquid } from "~/composables/useHyperliquid";
import {
  REFRESH_INTERVAL,
  TREND_BEARISH,
  TREND_BULLISH,
} from "~~/shared/constants";
import type { Database, Tables } from "~/types/database.types";
import RecentBearishFlipsTable from "~/features/dashboard/RecentBearishFlipsTable.vue";
import ActiveTrade from "~/features/trading/ActiveTrade.vue";

const { useAllMids } = useHyperliquid();
const { data: allMids } = useAllMids();
const supabase = useSupabaseClient<Database>();

const fetchRecentFlips = async (timeframe: "D1" | "W1") => {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("timeframe", timeframe)
    .limit(10)
    .order("since", { ascending: false });

  if (error) throw error;

  // Group by coin and take the most recent flip for each coin
  const coinFlips = new Map<string, Tables<"events">>();
  for (const event of data) {
    if (!coinFlips.has(event.coin)) {
      coinFlips.set(event.coin, event);
    }
  }

  // Return the 5 most recent flips (one per coin)
  return Array.from(coinFlips.values())
    .sort(
      (a, b) =>
        new Date(b.since || b.timestamp).getTime() -
        new Date(a.since || a.timestamp).getTime()
    )
    .slice(0, 5) as Tables<"events">[];
};

const fetchTrendPercentages = async (timeframe: "D1" | "W1") => {
  const { data, error } = await supabase
    .from("trends")
    .select("status")
    .eq("timeframe", timeframe);

  if (error) throw error;

  const total = data.length;
  const bullish = data.filter((trend) => trend.status === TREND_BULLISH).length;
  const bearish = total - bullish;

  return {
    total,
    bullish,
    bearish,
    bullishPercentage: total > 0 ? Math.round((bullish / total) * 100) : 0,
    bearishPercentage: total > 0 ? Math.round((bearish / total) * 100) : 0,
  };
};

const { data: weeklyFlips, isLoading: isLoadingWeekly } = useQuery({
  queryKey: ["recent_flips", "W1"],
  queryFn: () => fetchRecentFlips("W1"),
  refetchInterval: REFRESH_INTERVAL,
});

const { data: dailyFlips, isLoading: isLoadingDaily } = useQuery({
  queryKey: ["recent_flips", "D1"],
  queryFn: () => fetchRecentFlips("D1"),
  refetchInterval: REFRESH_INTERVAL,
});

const { data: weeklyTrends } = useQuery({
  queryKey: ["trend_percentages", "W1"],
  queryFn: () => fetchTrendPercentages("W1"),
  refetchInterval: REFRESH_INTERVAL,
});

const { data: dailyTrends } = useQuery({
  queryKey: ["trend_percentages", "D1"],
  queryFn: () => fetchTrendPercentages("D1"),
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
          The latest 5 pairs that flipped to either bullish or bearish trend.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentBearishFlipsTable
          title="Last 5 Weekly Flips"
          :events="weeklyFlips || []"
          :all-mids="allMids || null"
          :loading="isLoadingWeekly"
          :trend-percentages="weeklyTrends"
        />

        <RecentBearishFlipsTable
          title="Last 5 Daily Flips"
          :events="dailyFlips || []"
          :all-mids="allMids || null"
          :loading="isLoadingDaily"
          :trend-percentages="dailyTrends"
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
