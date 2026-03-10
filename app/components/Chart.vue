<script setup lang="ts">
import { use } from "echarts/core.js";
import { CanvasRenderer } from "echarts/renderers.js";
import { CandlestickChart, BarChart, LineChart } from "echarts/charts.js";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkPointComponent,
  MarkAreaComponent,
  VisualMapComponent,
} from "echarts/components.js";
import VChart from "vue-echarts";
import dayjs from "dayjs";

import type { HyperliquidCandle, TrendFlip, TrendStatus } from "#shared/types.js";
import { TREND_BULLISH, TREND_BEARISH } from "#shared/constants.js";

use([
  CanvasRenderer,
  CandlestickChart,
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkPointComponent,
  MarkAreaComponent,
  VisualMapComponent,
]);

const props = defineProps<{
  candles: HyperliquidCandle[];
  coin: string;
  sma50?: number[];
  sma200?: number[];
  flips?: TrendFlip[];
  currentStatus?: TrendStatus;
}>();

const option = computed(() => {
  if (!props.candles || props.candles.length === 0) return {};

  const dates = props.candles.map((c) => dayjs(c.t).format("YYYY-MM-DD"));
  const data = props.candles.map((c) => [
    parseFloat(c.o),
    parseFloat(c.c),
    parseFloat(c.l),
    parseFloat(c.h),
  ]);
  const volumes = props.candles.map((c) => parseFloat(c.v));

  const duration = props.candles[0]?.i === "1w" ? "week" : "day";

  const markAreaData: any[] = [];
  if (props.flips && props.flips.length > 0) {
    // Initial trend before the first flip
    const firstFlip = props.flips[0]!;
    const initialStatus = firstFlip.status === TREND_BULLISH ? TREND_BEARISH : TREND_BULLISH;
    const firstFlipDate = dayjs(firstFlip.timestamp)
      .subtract(1, duration)
      .format("YYYY-MM-DD");

    markAreaData.push([
      {
        xAxis: dates[0],
        itemStyle: {
          color:
            initialStatus === TREND_BULLISH
              ? "rgba(16, 185, 129, 0.2)"
              : "rgba(239, 68, 68, 0.2)",
        },
      },
      { xAxis: firstFlipDate },
    ]);

    // Trend between flips
    for (let i = 0; i < props.flips.length - 1; i++) {
      const currentFlip = props.flips[i]!;
      const nextFlip = props.flips[i + 1]!;
      const startDate = dayjs(currentFlip.timestamp)
        .subtract(1, duration)
        .format("YYYY-MM-DD");
      const endDate = dayjs(nextFlip.timestamp)
        .subtract(1, duration)
        .format("YYYY-MM-DD");

      markAreaData.push([
        {
          xAxis: startDate,
          itemStyle: {
            color:
              currentFlip.status === TREND_BULLISH
                ? "rgba(16, 185, 129, 0.2)"
                : "rgba(239, 68, 68, 0.2)",
          },
        },
        { xAxis: endDate },
      ]);
    }

    // Final trend from last flip to today
    const lastFlip = props.flips[props.flips.length - 1]!;
    const lastFlipDate = dayjs(lastFlip.timestamp)
      .subtract(1, duration)
      .format("YYYY-MM-DD");

    markAreaData.push([
      {
        xAxis: lastFlipDate,
        itemStyle: {
          color:
            lastFlip.status === TREND_BULLISH
              ? "rgba(16, 185, 129, 0.2)"
              : "rgba(239, 68, 68, 0.2)",
        },
      },
      { xAxis: dates[dates.length - 1] },
    ]);
  } else if (props.currentStatus) {
    // No flips in the period, just color the whole background
    markAreaData.push([
      {
        xAxis: dates[0],
        itemStyle: {
          color:
            props.currentStatus === TREND_BULLISH
              ? "rgba(16, 185, 129, 0.2)"
              : "rgba(239, 68, 68, 0.2)",
        },
      },
      { xAxis: dates[dates.length - 1] },
    ]);
  }

  const markPointData = props.flips?.map((flip) => {
    // The flip timestamp is the start of the next candle after the flip.
    // To mark the candle that triggered the flip, we subtract one timeframe period.
    const candleDate = dayjs(flip.timestamp)
      .subtract(1, duration)
      .format("YYYY-MM-DD");

    // Find the candle corresponding to this date to position the tag
    const candleIdx = dates.findIndex((d) => d === candleDate);
    const candle = props.candles[candleIdx];

    const isBullish = flip.status === TREND_BULLISH;

    if (!candle) {
      return {
        coord: [candleDate, 0],
        symbol: "none",
      };
    }

    const price = isBullish ? parseFloat(candle.l) : parseFloat(candle.h);

    return {
      name: flip.status,
      coord: [candleDate, price],
      value: isBullish ? "BULL" : "BEAR",
      symbol: "circle",
      symbolSize: 6,
      itemStyle: {
        color: isBullish ? "#10b981" : "#ef4444",
      },
      label: {
        show: true,
        position: isBullish ? "bottom" : "top",
        color: isBullish ? "#10b981" : "#ef4444",
        fontSize: 10,
        fontWeight: "bold",
        formatter: isBullish ? "BULL" : "BEAR",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        padding: [2, 4],
        borderRadius: 4,
        borderColor: isBullish ? "#10b981" : "#ef4444",
        borderWidth: 1,
        distance: 10,
      },
    };
  });

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
      { scale: true, splitArea: { show: false } },
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
          color: "#10b981",
          color0: "#ef4444",
          borderColor: "#10b981",
          borderColor0: "#ef4444",
        },
        markPoint: {
          data: (markPointData as any) || [],
        },
        markArea: {
          data: markAreaData,
          silent: true,
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
