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
  lastUpdated?: number;
}>();

const emit = defineEmits<{
  (e: "refreshSubscriptions"): void;
}>();

const supabase = useSupabaseClient<Database>();
const userId = useUserId();

const isSubscribingAll = ref(false);
const isUnsubscribingAll = ref(false);

const sorting = ref([{ id: "daily", desc: true }]);

const columns = [
  {
    id: "coin",
    accessorKey: "coin",
    header: "Asset",
    enableSorting: true,
  },
  {
    id: "price",
    accessorFn: (row: MonitoredPairWithTrends) =>
      getPrice(props.allMids, row.coin),
    header: "Price",
    enableSorting: true,
  },
  {
    id: "daily",
    accessorKey: "last_trend_flip_daily",
    header: "Daily (D1)",
    enableSorting: true,
  },
  {
    id: "weekly",
    accessorKey: "last_trend_flip_weekly",
    header: "Weekly (W1)",
    enableSorting: true,
  },
  {
    id: "last_analyzed",
    accessorKey: "last_analyzed",
    header: "Last Analyzed",
    enableSorting: true,
  },
  {
    id: "actions",
    accessorFn: () => "",
    header: "Action",
    meta: {
      class: {
        th: "text-right",
        td: "text-right",
      },
    },
  },
];

const getPrice = (allMids: Record<string, string> | null, coin: string) => {
  return allMids?.[coin] || "0.00";
};

const sortedPairs = computed(() => {
  const sort = sorting.value[0];
  if (!sort) return props.pairs;

  const { id: sortId, desc } = sort;
  const sortDirection = desc ? "desc" : "asc";

  const sorted = [...props.pairs].sort((a, b) => {
    let valA: string | number = 0;
    let valB: string | number = 0;

    switch (sortId) {
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

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
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
      <UTable
        v-model:sorting="sorting"
        :data="sortedPairs"
        :columns="columns"
        class="w-full"
      >
        <template #coin-header="{ column }">
          <TableSortButton :column="column" label="Asset" />
        </template>

        <template #price-header="{ column }">
          <TableSortButton :column="column" label="Price" />
        </template>

        <template #daily-header="{ column }">
          <TableSortButton :column="column" label="Daily (D1)" />
        </template>

        <template #weekly-header="{ column }">
          <TableSortButton :column="column" label="Weekly (W1)" />
        </template>

        <template #last_analyzed-header="{ column }">
          <TableSortButton :column="column" label="Last Analyzed" />
        </template>

        <template #coin-cell="{ row }">
          <CoinDisplay :coin="row.original.coin" />
        </template>

        <template #price-cell="{ row }">
          <span class="font-mono text-sm">
            {{ formatPrice(getPrice(allMids, row.original.coin)) }}
          </span>
        </template>

        <template #daily-cell="{ row }">
          <TrendIndicator
            :status="getStatus(row.original.last_trend_flip_daily)"
            :since="row.original.last_trend_flip_daily?.since || undefined"
          />
        </template>

        <template #weekly-cell="{ row }">
          <TrendIndicator
            :status="getStatus(row.original.last_trend_flip_weekly)"
            :since="row.original.last_trend_flip_weekly?.since || undefined"
          />
        </template>

        <template #last_analyzed-cell="{ row }">
          <span class="text-xs text-gray-500">
            <RelativeTime :timestamp="row.original.last_analyzed" />
          </span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center justify-end gap-2">
            <SubscriptionToggle
              :coin="row.original.coin"
              timeframe="D1"
              :subscriptions="subscriptions"
              @refresh="emit('refreshSubscriptions')"
            />
            <SubscriptionToggle
              :coin="row.original.coin"
              timeframe="W1"
              :subscriptions="subscriptions"
              @refresh="emit('refreshSubscriptions')"
            />
            <UButton
              :to="`/pair/${row.original.coin}`"
              icon="i-lucide-chevron-right"
              size="xs"
              variant="ghost"
              color="neutral"
            />
          </div>
        </template>
      </UTable>
    </div>
  </UCard>
</template>
