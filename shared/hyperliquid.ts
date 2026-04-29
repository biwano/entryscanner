import {
  InfoClient,
  ExchangeClient,
  HttpTransport,
  type CandleSnapshotParameters,
} from "@nktkas/hyperliquid";
import type { PrivateKeyAccount } from "viem";

export type CandleInterval = CandleSnapshotParameters["interval"];

export class HyperliquidClient {
  private infoClient: InfoClient;
  private transport: HttpTransport;

  constructor(baseUrl: string = "https://api.hyperliquid.xyz") {
    this.transport = new HttpTransport({ apiUrl: baseUrl });
    this.infoClient = new InfoClient({ transport: this.transport });
  }

  getExchangeClient(signer: PrivateKeyAccount) {
    return new ExchangeClient({
      transport: this.transport,
      wallet: signer,
    });
  }

  async fetchCandles(
    coin: string,
    interval: CandleInterval,
    startTime: number,
    endTime?: number
  ) {
    // interval: 1m, 5m, 1h, 1d, 1w etc.
    return await this.infoClient.candleSnapshot({
      coin,
      interval,
      startTime,
      endTime,
    });
  }

  async fetchAllMids() {
    return await this.infoClient.allMids();
  }

  async fetchMetaAndAssetCtxs() {
    return await this.infoClient.metaAndAssetCtxs();
  }

  async fetchMeta() {
    return await this.infoClient.meta();
  }

  async fetchClearinghouseState(user: string) {
    return await this.infoClient.clearinghouseState({ user });
  }

  async fetchOpenOrders(user: string) {
    return await this.infoClient.openOrders({ user });
  }

  async fetchUserFills(user: string) {
    return await this.infoClient.userFills({ user });
  }
}
