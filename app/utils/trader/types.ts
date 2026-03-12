import type { useTraderStore } from "~/composables/useTraderStore";
import type { HyperliquidClient } from "~~shared/hyperliquid";
import type { UserTrade } from "~/types/database.friendly.types";
import type {
  MetaResponse,
  AllMidsResponse,
  ClearinghouseStateResponse,
} from "@nktkas/hyperliquid";

export interface TraderContext {
  supabase: any;
  user: any;
  traderStore: ReturnType<typeof useTraderStore>;
  hlClient: HyperliquidClient;
  exchangeClient: any;
  trade: UserTrade;
  address: string;
  refresh: () => Promise<void>;
  meta: MetaResponse;
  allMids: AllMidsResponse;
  clearinghouseState: ClearinghouseStateResponse;
}
