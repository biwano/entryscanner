import { useQuery } from "@tanstack/vue-query";
import { HyperliquidClient, type CandleInterval } from "#shared/hyperliquid";
import type { HyperliquidCandle } from "#shared/types";

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
    coin: string,
    interval: CandleInterval,
    startTime: number,
    endTime?: number
  ) => {
    return useQuery({
      queryKey: ["candles", coin, interval, startTime, endTime],
      queryFn: async (): Promise<HyperliquidCandle[]> => {
        const response = await client.fetchCandles(coin, interval, startTime, endTime);
        return response;
      }
    });
  };

  return {
    useAllMids,
    useMetaAndAssetCtxs,
    useCandles,
  };
};
