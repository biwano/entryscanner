import type { useTraderStore } from "~/composables/useTraderStore";
import type { HyperliquidClient } from "~~shared/hyperliquid";
import type { UserTrade } from "~/types/database.friendly.types";
import type {
  MetaResponse,
  AllMidsResponse,
  ClearinghouseStateResponse,
} from "@nktkas/hyperliquid";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types";

type ExchangeClient = ReturnType<HyperliquidClient["getExchangeClient"]>;

export interface TraderContext {
  supabase: SupabaseClient<Database>;
  userId: string;
  traderStore: ReturnType<typeof useTraderStore>;
  hlClient: HyperliquidClient;
  exchangeClient: ExchangeClient;
  trade: UserTrade;
  address: string;
  refresh: () => Promise<void>;
  meta: MetaResponse;
  allMids: AllMidsResponse;
  clearinghouseState: ClearinghouseStateResponse;
}
