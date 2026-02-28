import { InfoClient, HttpTransport } from '@nktkas/hyperliquid';

export const createInfoClient = (baseUrl: string = 'https://api.hyperliquid.xyz') => {
  const transport = new HttpTransport({ url: baseUrl });
  return new InfoClient(transport);
};

export const fetchCandles = async (client: InfoClient, coin: string, interval: string, startTime: number, endTime?: number) => {
  // interval: 1m, 5m, 1h, 1d, 1w etc.
  return await client.candleSnapshot({
    req: {
      coin,
      interval,
      startTime,
      endTime
    }
  });
};

export const fetchAllMids = async (client: InfoClient) => {
  return await client.allMids();
};

export const fetchMetaAndAssetCtxs = async (client: InfoClient) => {
  return await client.metaAndAssetCtxs();
};

export const fetchMeta = async (client: InfoClient) => {
    return await client.meta();
}
