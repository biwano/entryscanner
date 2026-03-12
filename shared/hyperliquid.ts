import {
  InfoClient,
  HttpTransport,
  type CandleSnapshotParameters,
} from "@nktkas/hyperliquid";

export type CandleInterval = CandleSnapshotParameters["interval"];

export class HyperliquidClient {
  private client: InfoClient;

  constructor(baseUrl: string = "https://api.hyperliquid.xyz") {
    const transport = new HttpTransport({ apiUrl: baseUrl });
    this.client = new InfoClient({ transport });
  }

  async fetchCandles(
    coin: string,
    interval: CandleInterval,
    startTime: number,
    endTime?: number
  ) {
    // interval: 1m, 5m, 1h, 1d, 1w etc.
    return await this.client.candleSnapshot({
      coin,
      interval,
      startTime,
      endTime,
    });
  }

  async fetchAllMids() {
    return await this.client.allMids();
  }

  async fetchMetaAndAssetCtxs() {
    return await this.client.metaAndAssetCtxs();
  }

  async fetchMeta() {
    return await this.client.meta();
  }

  async fetchClearinghouseState(user: string) {
    return await this.client.clearinghouseState({ user });
  }

  async fetchOpenOrders(user: string) {
    return await this.client.openOrders({ user });
  }
}
