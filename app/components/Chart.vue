<script setup lang="ts">
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { CandlestickChart, BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  VisualMapComponent,
} from "echarts/components";
import VChart from "vue-echarts";

import type { HyperliquidCandle } from "#shared/types";

use([
  CanvasRenderer,
  CandlestickChart,
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  VisualMapComponent,
]);

const props = defineProps<{
  candles: HyperliquidCandle[];
  coin: string;
  sma50?: number[];
  sma200?: number[];
}>();

const option = computed(() => {
  if (!props.candles || props.candles.length === 0) return {};

  const dates = props.candles.map(
    (c) => new Date(c.t).toISOString().split("T")[0]
  );
  const data = props.candles.map((c) => [
    parseFloat(c.o),
    parseFloat(c.c),
    parseFloat(c.l),
    parseFloat(c.h),
  ]);
  const volumes = props.candles.map((c) => parseFloat(c.v));

  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
    },
    grid: [
      { left: "8%", right: "8%", height: "60%" },
      { left: "8%", right: "8%", top: "75%", height: "15%" },
    ],
    xAxis: [
      {
        type: "category",
        data: dates,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: "dataMin",
        max: "dataMax",
      },
      {
        type: "category",
        gridIndex: 1,
        data: dates,
        boundaryGap: false,
        axisLine: { onZero: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
      },
    ],
    yAxis: [
      { scale: true, splitArea: { show: true } },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
    dataZoom: [
      { type: "inside", xAxisIndex: [0, 1], start: 0, end: 100 },
      {
        show: true,
        xAxisIndex: [0, 1],
        type: "slider",
        bottom: "2%",
        start: 0,
        end: 100,
      },
    ],
    series: [
      {
        name: "Price",
        type: "candlestick",
        data: data,
        itemStyle: {
          color: "#ef4444",
          color0: "#10b981",
          borderColor: "#ef4444",
          borderColor0: "#10b981",
        },
      },
      {
        name: "SMA 50",
        type: "line",
        data: props.sma50 || [],
        smooth: true,
        lineStyle: { opacity: 0.8, color: "#f59e0b", width: 2 },
        itemStyle: { opacity: 0 },
      },
      {
        name: "SMA 200",
        type: "line",
        data: props.sma200 || [],
        smooth: true,
        lineStyle: { opacity: 0.8, color: "#d946ef", width: 2 },
        itemStyle: { opacity: 0 },
      },
      {
        name: "Volume",
        type: "bar",
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumes,
        itemStyle: { color: "#6366f1" },
      },
    ],
  };
});
</script>

<template>
  <div class="h-[500px] w-full">
    <VChart :option="option" autoresize />
  </div>
</template>
