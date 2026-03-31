import { useQuery } from "@tanstack/vue-query";
import { toValue, type MaybeRefOrGetter } from "vue";
import {
  HyperliquidClient,
  type CandleInterval,
} from "~~/shared/hyperliquid.js";
import type { HyperliquidCandle } from "~~/shared/types.js";

export const useHyperliquid = () => {
  const client = new HyperliquidClient();

  const useAllMids = () => {
    return useQuery({
      queryKey: ["allMids"],
      queryFn: () => client.fetchAllMids(),
      refetchInterval: 50000, // Poll every 50 seconds
    });
  };

  const useMetaAndAssetCtxs = () => {
    return useQuery({
      queryKey: ["metaAndAssetCtxs"],
      queryFn: () => client.fetchMetaAndAssetCtxs(),
      refetchInterval: 100000, // Poll every 100 seconds
    });
  };

  const useCandles = (
    coin: MaybeRefOrGetter<string>,
    interval: MaybeRefOrGetter<CandleInterval>,
    startTime: MaybeRefOrGetter<number>,
    endTime?: MaybeRefOrGetter<number | undefined>
  ) => {
    return useQuery({
      queryKey: ["candles", coin, interval, startTime, endTime],
      queryFn: async (): Promise<HyperliquidCandle[]> => {
        const response = await client.fetchCandles(
          toValue(coin),
          toValue(interval),
          toValue(startTime),
          toValue(endTime)
        );
        return response;
      },
    });
  };

  return {
    useAllMids,
    useMetaAndAssetCtxs,
    useCandles,
  };
};
