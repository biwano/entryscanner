<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useSupabaseClient } from "#imports";
import type { Database } from "~/types/database.types";
import type {
  MonitoredPairWithTrends,
  UserSubscription,
} from "~/types/database.friendly.types";
import dayjs from "dayjs";
import { calculatePercentChange } from "~/utils/format";
import TableHeader from "./TableHeader.vue";
import TableBody from "./TableBody.vue";
import TableSkeleton from "./TableSkeleton.vue";

defineOptions({
  name: "MonitoredPairsTable",
});

const props = defineProps<{
  pairs: MonitoredPairWithTrends[];
  allMids: Record<string, string> | null;
  isAdmin: boolean;
  subscriptions: UserSubscription[];
  lastUpdated?: number;
  loading?: boolean;
  page?: number;
}>();

const emit = defineEmits<{
  (e: "refreshSubscriptions"): void;
  (e: "update:page", value: number): void;
}>();

const supabase = useSupabaseClient<Database>();
const userId = useUserId();

const isSubscribingAll = ref(false);
const isUnsubscribingAll = ref(false);
const search = ref("");

const STORAGE_KEY = "monitored_pairs_sorting";
const sorting = useLocalStorage(STORAGE_KEY, [{ id: "daily", desc: true }]);

const localPage = computed({
  get: () => props.page || 1,
  set: (val: number) => {
    emit("update:page", val);
  },
});
const itemsPerPage = 10;

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
    id: "daily_change",
    accessorFn: (row: MonitoredPairWithTrends) =>
      row.last_trend_flip_daily
        ? calculatePercentChange(
            getPrice(props.allMids, row.coin),
            row.last_trend_flip_daily.price_at_flip || 0
          )
        : 0,
    header: "Daily Change %",
    enableSorting: true,
  },
  {
    id: "weekly",
    accessorKey: "last_trend_flip_weekly",
    header: "Weekly (W1)",
    enableSorting: true,
  },
  {
    id: "weekly_change",
    accessorFn: (row: MonitoredPairWithTrends) =>
      row.last_trend_flip_weekly
        ? calculatePercentChange(
            getPrice(props.allMids, row.coin),
            row.last_trend_flip_weekly.price_at_flip || 0
          )
        : 0,
    header: "Weekly Change %",
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
  let filtered = props.pairs;

  if (search.value) {
    const query = search.value.toLowerCase();
    filtered = props.pairs.filter((pair) =>
      pair.coin.toLowerCase().includes(query)
    );
  }

  const sort = sorting.value[0];
  if (!sort) return filtered;

  const { id: sortId, desc } = sort;
  const sortDirection = desc ? "desc" : "asc";

  const sorted = [...filtered].sort((a, b) => {
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
      case "daily_change":
        valA = a.last_trend_flip_daily
          ? calculatePercentChange(
              getPrice(props.allMids, a.coin),
              a.last_trend_flip_daily.price_at_flip || 0
            )
          : 0;
        valB = b.last_trend_flip_daily
          ? calculatePercentChange(
              getPrice(props.allMids, b.coin),
              b.last_trend_flip_daily.price_at_flip || 0
            )
          : 0;
        break;
      case "weekly":
        valA = dayjs(a.last_trend_flip_weekly?.since || 0).valueOf();
        valB = dayjs(b.last_trend_flip_weekly?.since || 0).valueOf();
        break;
      case "weekly_change":
        valA = a.last_trend_flip_weekly
          ? calculatePercentChange(
              getPrice(props.allMids, a.coin),
              a.last_trend_flip_weekly.price_at_flip || 0
            )
          : 0;
        valB = b.last_trend_flip_weekly
          ? calculatePercentChange(
              getPrice(props.allMids, b.coin),
              b.last_trend_flip_weekly.price_at_flip || 0
            )
          : 0;
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

const pagedPairs = computed(() => {
  const start = (localPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return sortedPairs.value.slice(start, end);
});

// Reset to page 1 when search changes, but only if not on initial load
watch([search], () => {
  if (props.pairs.length > 0) {
    localPage.value = 1;
  }
});

// Ensure current page is valid when pairs change
watch(
  () => sortedPairs.value.length,
  (newCount) => {
    if (props.loading) return;
    const maxPage = Math.max(1, Math.ceil(newCount / itemsPerPage));
    if (localPage.value > maxPage) {
      localPage.value = maxPage;
    }
  }
);

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
</script>

<template>
  <UCard class="shadow-sm">
    <template #header>
      <TableHeader
        v-model:search="search"
        :last-updated="lastUpdated"
        :user-id="userId || undefined"
        :is-admin="isAdmin"
        :is-subscribing-all="isSubscribingAll"
        :is-unsubscribing-all="isUnsubscribingAll"
        @subscribe-all="handleSubscribeAll"
        @unsubscribe-all="handleUnsubscribeAll"
      />
    </template>

    <div class="overflow-x-auto">
      <TableBody
        v-if="!loading"
        v-model:sorting="sorting"
        v-model:page="localPage"
        :data="pagedPairs"
        :columns="columns"
        :all-mids="allMids"
        :subscriptions="subscriptions"
        :total-items="sortedPairs.length"
        :total-monitored="pairs.length"
        :items-per-page="itemsPerPage"
        @refresh-subscriptions="emit('refreshSubscriptions')"
      />

      <TableSkeleton v-else :columns="columns" />
    </div>
  </UCard>
</template>
