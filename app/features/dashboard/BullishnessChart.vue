<script setup lang="ts">
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  TitleComponent,
} from "echarts/components";
import VChart from "vue-echarts";
import dayjs from "dayjs";
import { useSupabaseClient } from "#imports";
import { useQuery } from "@tanstack/vue-query";
import { REFRESH_INTERVAL } from "~~/shared/constants";
import type { Database } from "~/types/database.types";

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  TitleComponent,
]);

const props = defineProps<{
  title: string;
  timeframe: "D1" | "W1";
}>();

const supabase = useSupabaseClient<Database>();

const fetchStats = async () => {
  const oneYearAgo = dayjs().subtract(365, "day").startOf("day").toISOString();
  const { data, error } = await supabase
    .from("stats")
    .select("*")
    .gte("day", oneYearAgo)
    .order("day", { ascending: true });

  if (error) throw error;
  return data;
};

const { data: stats, isLoading } = useQuery({
  queryKey: ["market_stats"],
  queryFn: fetchStats,
  refetchInterval: REFRESH_INTERVAL,
});

const option = computed(() => {
  if (!stats.value || stats.value.length === 0) return {};

  const dates = stats.value.map((s) => dayjs(s.day).format("YYYY-MM-DD"));
  const values = stats.value.map((s) => {
    const total = s.pairs_total || 0;
    const bullish =
      props.timeframe === "D1"
        ? s.pairs_bullish_daily
        : s.pairs_bullish_weekly;
    return total > 0 ? Math.round(((bullish || 0) / total) * 100) : 0;
  });

  return {
    tooltip: {
      trigger: "axis",
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        if (!p) return "";
        return `<div class="font-bold mb-1">${p.name}</div>
                <div class="text-xs">
                  <span class="text-gray-500">Bullish:</span> 
                  <span class="font-mono font-bold ${
                    p.value >= 50 ? "text-green-500" : "text-red-500"
                  }">${p.value}%</span>
                </div>`;
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "5%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dates,
      boundaryGap: false,
      axisLine: { lineStyle: { color: "#334155" } },
      axisLabel: { color: "#64748b", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      interval: 25,
      axisLabel: { 
        formatter: "{value}%",
        color: "#64748b",
        fontSize: 10
      },
      splitLine: { lineStyle: { color: "#1e293b" } },
    },
    visualMap: {
      show: false,
      dimension: 1,
      pieces: [
        {
          gt: 0,
          lte: 50,
          color: "#ef4444", // red below 50%
        },
        {
          gt: 50,
          lte: 100,
          color: "#10b981", // green above 50%
        },
      ],
    },
    series: [
      {
        name: "Bullish %",
        type: "line",
        data: values,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3 },
        areaStyle: {
          opacity: 0.2,
        },
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: false },
          data: [{ yAxis: 50, lineStyle: { color: "#475569", type: "dashed" } }],
        },
      },
    ],
  };
});
</script>

<template>
  <UCard class="shadow-sm">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold">{{ title }}</h3>
      </div>
    </template>

    <div class="h-[300px] w-full relative">
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
      </div>
      <VChart v-else-if="stats && stats.length > 0" :option="option" autoresize />
      <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
        <UIcon name="i-lucide-info" class="w-8 h-8 mb-2 opacity-50" />
        <p>No statistics available yet.</p>
      </div>
    </div>
  </UCard>
</template>
