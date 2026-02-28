<script setup lang="ts">
import { computed } from "vue";
import { useSupabaseClient, useSupabaseUser } from "#imports";
import { useAsyncData } from "#app";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { useUser } from "~/composables/useUser";
import { formatRelativeTime } from "#shared/time";

const { useAllMids, useMetaAndAssetCtxs } = useHyperliquid();
const { isAdmin } = useUser();
const { data: allMids } = useAllMids();
const { data: metaAndAssetCtxs } = useMetaAndAssetCtxs();

interface Trend {
  id: string;
  coin: string;
  timeframe: string;
  status: "bullish" | "bearish";
  since: string;
  created_at: string;
}

interface MonitoredPair {
  id: string;
  coin: string;
  last_trend_flip_daily_id: string | null;
  last_trend_flip_weekly_id: string | null;
  last_analyzed: string;
  last_updated: string;
  created_at: string;
  last_trend_flip_daily?: Trend;
  last_trend_flip_weekly?: Trend;
}

interface UserSubscription {
  id: string;
  user_id: string;
  coin: string;
  timeframe: "D1" | "W1";
  created_at: string;
}

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { data: monitoredPairs, refresh: refreshMonitored } = await useAsyncData(
  "monitored_pairs",
  async () => {
    const { data } = await supabase
      .from("monitored_pairs")
      .select(
        `
      *,
      last_trend_flip_daily:trends!last_trend_flip_daily_id (*),
      last_trend_flip_weekly:trends!last_trend_flip_weekly_id (*)
    `
      )
      .order("last_updated", { ascending: false });
    return data as MonitoredPair[] | null;
  }
);

const { data: userSubscriptions, refresh: refreshSubscriptions } =
  await useAsyncData("user_subscriptions_dash", async () => {
    if (!user.value) return [];
    const { data } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.value.id);
    return (data as UserSubscription[]) || [];
  });

const sortedPairs = computed(() => {
  if (!monitoredPairs.value) return [];

  // Sort by how long they have been in their current trend (descending order - most recent first)
  return [...monitoredPairs.value].sort((a, b) => {
    const timeA = new Date(a.last_trend_flip_daily?.since || 0).getTime();
    const timeB = new Date(b.last_trend_flip_daily?.since || 0).getTime();
    return timeB - timeA;
  });
});

const isSubscribed = (coin: string, timeframe: "D1" | "W1") => {
  return (userSubscriptions.value as UserSubscription[] | null)?.some(
    (s) => s.coin === coin && s.timeframe === timeframe
  );
};

const toggleSubscription = async (coin: string, timeframe: "D1" | "W1") => {
  if (!user.value) {
    alert("Please log in to subscribe to alerts!");
    return;
  }

  if (isSubscribed(coin, timeframe)) {
    const sub = (userSubscriptions.value as UserSubscription[] | null)?.find(
      (s) => s.coin === coin && s.timeframe === timeframe
    );
    if (sub) {
      await (supabase.from("user_subscriptions") as any)
        .delete()
        .eq("id", sub.id);
    }
  } else {
    await (supabase.from("user_subscriptions") as any).insert({
      user_id: user.value.id,
      coin,
      timeframe,
    });
  }
  await refreshSubscriptions();
};

const getPrice = (coin: string) => {
  return allMids.value?.[coin] || "0.00";
};

const formatPrice = (price: string | number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(price));
};
</script>

<template>
  <div class="space-y-8">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UButton color="primary" variant="subtle">Test Toast</UButton>

      <UCard
        v-for="pair in sortedPairs?.slice(0, 3) || []"
        :key="pair.id"
        class="shadow-sm border border-gray-100 dark:border-gray-800"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-bold text-lg text-gray-900 dark:text-white">{{
              pair.coin
            }}</span>
            <UBadge
              :color="
                pair.last_trend_flip_daily?.status === 'bullish'
                  ? 'success'
                  : 'error'
              "
            >
              {{
                pair.last_trend_flip_daily?.status?.toUpperCase() || "UNKNOWN"
              }}
            </UBadge>
          </div>
        </template>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Current Price</span>
            <span class="font-medium font-mono">{{
              formatPrice(getPrice(pair.coin))
            }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Trend Since</span>
            <span
              >{{
                formatRelativeTime(pair.last_trend_flip_daily?.since)
              }}
              ago</span
            >
          </div>
        </div>
        <template #footer>
          <UButton
            :to="`/pair/${pair.coin}`"
            color="neutral"
            variant="subtle"
            block
          >
            View Details
          </UButton>
        </template>
      </UCard>
    </div>

    <UCard class="shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">Monitored Pairs</h2>
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
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead
            class="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase font-semibold"
          >
            <tr>
              <th class="px-6 py-3">Asset</th>
              <th class="px-6 py-3">Price</th>
              <th class="px-6 py-3">Daily (D1)</th>
              <th class="px-6 py-3">Weekly (W1)</th>
              <th class="px-6 py-3">Last Updated</th>
              <th class="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="pair in sortedPairs"
              :key="pair.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs"
                  >
                    {{ pair.coin[0] }}
                  </div>
                  <span class="font-semibold text-gray-900 dark:text-white">{{
                    pair.coin
                  }}</span>
                </div>
              </td>
              <td class="px-6 py-4 font-mono text-sm">
                {{ formatPrice(getPrice(pair.coin)) }}
              </td>
              <td class="px-6 py-4">
                <TrendIndicator
                  :status="pair.last_trend_flip_daily?.status"
                  :since="pair.last_trend_flip_daily?.since"
                />
              </td>
              <td class="px-6 py-4">
                <TrendIndicator
                  :status="pair.last_trend_flip_weekly?.status"
                  :since="pair.last_trend_flip_weekly?.since"
                />
              </td>
              <td class="px-6 py-4 text-xs text-gray-500">
                {{ formatRelativeTime(pair.last_updated) }} ago
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <UButton
                    size="xs"
                    :color="
                      isSubscribed(pair.coin, 'D1') ? 'primary' : 'neutral'
                    "
                    :variant="isSubscribed(pair.coin, 'D1') ? 'solid' : 'ghost'"
                    :icon="
                      isSubscribed(pair.coin, 'D1')
                        ? 'i-lucide-bell'
                        : 'i-lucide-bell-off'
                    "
                    @click="toggleSubscription(pair.coin, 'D1')"
                  >
                    D1
                  </UButton>
                  <UButton
                    size="xs"
                    :color="
                      isSubscribed(pair.coin, 'W1') ? 'primary' : 'neutral'
                    "
                    :variant="isSubscribed(pair.coin, 'W1') ? 'solid' : 'ghost'"
                    :icon="
                      isSubscribed(pair.coin, 'W1')
                        ? 'i-lucide-bell'
                        : 'i-lucide-bell-off'
                    "
                    @click="toggleSubscription(pair.coin, 'W1')"
                  >
                    W1
                  </UButton>
                  <UButton
                    :to="`/pair/${pair.coin}`"
                    icon="i-lucide-chevron-right"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
