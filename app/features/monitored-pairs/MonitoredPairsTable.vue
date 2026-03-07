<script setup lang="ts">
import { ref, computed } from "vue";
import { useSupabaseClient } from "#imports";
import type { Database } from "~/types/database.types.js";
import type {
  MonitoredPairWithTrends,
  UserSubscription,
} from "~/types/database.friendly.types.js";
import SubscriptionToggle from "../subscriptions/SubscriptionToggle.vue";
import dayjs from "dayjs";

const props = defineProps<{
  pairs: MonitoredPairWithTrends[];
  allMids: Record<string, string> | null;
  isAdmin: boolean;
  subscriptions: UserSubscription[];
}>();

const emit = defineEmits<{
  (e: "refreshSubscriptions"): void;
}>();

const supabase = useSupabaseClient<Database>();
const userId = useUserId();

const isSubscribingAll = ref(false);
const isUnsubscribingAll = ref(false);

const sortColumn = ref<string>("daily");
const sortDirection = ref<"asc" | "desc">("desc");

const sortBy = (column: string) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortColumn.value = column;
    sortDirection.value = "desc";
  }
};

const getPrice = (allMids: Record<string, string> | null, coin: string) => {
  return allMids?.[coin] || "0.00";
};

const sortedPairs = computed(() => {
  const sorted = [...props.pairs].sort((a, b) => {
    let valA: string | number = 0;
    let valB: string | number = 0;

    switch (sortColumn.value) {
      case "coin":
        valA = a.coin;
        valB = b.coin;
        break;
      case "price":
        valA = Number(getPrice(props.allMids, a.coin));
        valB = Number(getPrice(props.allMids, b.coin));
        break;
      case "daily":
        valA = dayjs(a.last_trend_flip_daily?.since || 0).valueOf();
        valB = dayjs(b.last_trend_flip_daily?.since || 0).valueOf();
        break;
      case "weekly":
        valA = dayjs(a.last_trend_flip_weekly?.since || 0).valueOf();
        valB = dayjs(b.last_trend_flip_weekly?.since || 0).valueOf();
        break;
      case "last_analyzed":
        valA = dayjs(a.last_analyzed || 0).valueOf();
        valB = dayjs(b.last_analyzed || 0).valueOf();
        break;
      default:
        return 0;
    }

    if (valA < valB) return sortDirection.value === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection.value === "asc" ? 1 : -1;
    return 0;
  });

  return sorted;
});

const handleSubscribeAll = async () => {
  if (!userId.value) return;

  isSubscribingAll.value = true;
  try {
    const subscriptionsToUpsert = props.pairs.flatMap((pair) => [
      {
        user_id: userId.value as string,
        coin: pair.coin,
        timeframe: "D1" as const,
      },
      {
        user_id: userId.value as string,
        coin: pair.coin,
        timeframe: "W1" as const,
      },
    ]);

    await supabase.from("user_subscriptions").upsert(subscriptionsToUpsert, {
      onConflict: "user_id,coin,timeframe",
    });

    emit("refreshSubscriptions");
  } finally {
    isSubscribingAll.value = false;
  }
};

const handleUnsubscribeAll = async () => {
  if (!userId.value) return;

  isUnsubscribingAll.value = true;
  try {
    await supabase
      .from("user_subscriptions")
      .delete()
      .eq("user_id", userId.value);

    emit("refreshSubscriptions");
  } finally {
    isUnsubscribingAll.value = false;
  }
};

const getStatus = (
  event: MonitoredPairWithTrends["last_trend_flip_daily"]
): "bullish" | "bearish" | undefined => {
  if (!event) return undefined;
  return event.status as "bullish" | "bearish";
};
</script>

<template>
  <UCard class="shadow-sm">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">Monitored Pairs</h2>
        <div class="flex items-center gap-2">
          <UButton
            v-if="userId"
            icon="i-lucide-bell"
            size="sm"
            color="primary"
            variant="ghost"
            :loading="isSubscribingAll"
            @click="handleSubscribeAll"
            >Subscribe All</UButton
          >
          <UButton
            v-if="userId"
            icon="i-lucide-bell-off"
            size="sm"
            color="error"
            variant="ghost"
            :loading="isUnsubscribingAll"
            @click="handleUnsubscribeAll"
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

    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead
          class="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase font-semibold"
        >
          <tr>
            <th
              class="px-6 py-3 cursor-pointer hover:text-primary transition-colors"
              @click="sortBy('coin')"
            >
              <div class="flex items-center gap-1">
                Asset
                <UIcon
                  v-if="sortColumn === 'coin'"
                  :name="
                    sortDirection === 'asc'
                      ? 'i-lucide-arrow-up'
                      : 'i-lucide-arrow-down'
                  "
                  class="w-3 h-3"
                />
              </div>
            </th>
            <th
              class="px-6 py-3 cursor-pointer hover:text-primary transition-colors"
              @click="sortBy('price')"
            >
              <div class="flex items-center gap-1">
                Price
                <UIcon
                  v-if="sortColumn === 'price'"
                  :name="
                    sortDirection === 'asc'
                      ? 'i-lucide-arrow-up'
                      : 'i-lucide-arrow-down'
                  "
                  class="w-3 h-3"
                />
              </div>
            </th>
            <th
              class="px-6 py-3 cursor-pointer hover:text-primary transition-colors"
              @click="sortBy('daily')"
            >
              <div class="flex items-center gap-1">
                Daily (D1)
                <UIcon
                  v-if="sortColumn === 'daily'"
                  :name="
                    sortDirection === 'asc'
                      ? 'i-lucide-arrow-up'
                      : 'i-lucide-arrow-down'
                  "
                  class="w-3 h-3"
                />
              </div>
            </th>
            <th
              class="px-6 py-3 cursor-pointer hover:text-primary transition-colors"
              @click="sortBy('weekly')"
            >
              <div class="flex items-center gap-1">
                Weekly (W1)
                <UIcon
                  v-if="sortColumn === 'weekly'"
                  :name="
                    sortDirection === 'asc'
                      ? 'i-lucide-arrow-up'
                      : 'i-lucide-arrow-down'
                  "
                  class="w-3 h-3"
                />
              </div>
            </th>
            <th
              class="px-6 py-3 cursor-pointer hover:text-primary transition-colors"
              @click="sortBy('last_analyzed')"
            >
              <div class="flex items-center gap-1">
                Last Analyzed
                <UIcon
                  v-if="sortColumn === 'last_analyzed'"
                  :name="
                    sortDirection === 'asc'
                      ? 'i-lucide-arrow-up'
                      : 'i-lucide-arrow-down'
                  "
                  class="w-3 h-3"
                />
              </div>
            </th>
            <th class="px-6 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr
            v-for="pair in sortedPairs"
            :key="pair.coin"
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
              {{ formatPrice(getPrice(allMids, pair.coin)) }}
            </td>
            <td class="px-6 py-4">
              <TrendIndicator
                :status="getStatus(pair.last_trend_flip_daily)"
                :since="pair.last_trend_flip_daily?.since || undefined"
              />
            </td>
            <td class="px-6 py-4">
              <TrendIndicator
                :status="getStatus(pair.last_trend_flip_weekly)"
                :since="pair.last_trend_flip_weekly?.since || undefined"
              />
            </td>
            <td class="px-6 py-4 text-xs text-gray-500">
              <RelativeTime :timestamp="pair.last_analyzed" />
            </td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <SubscriptionToggle
                  :coin="pair.coin"
                  timeframe="D1"
                  :subscriptions="subscriptions"
                  @refresh="emit('refreshSubscriptions')"
                />
                <SubscriptionToggle
                  :coin="pair.coin"
                  timeframe="W1"
                  :subscriptions="subscriptions"
                  @refresh="emit('refreshSubscriptions')"
                />
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
</template>
