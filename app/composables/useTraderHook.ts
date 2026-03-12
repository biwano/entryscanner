import { useIntervalFn } from "@vueuse/core";
import { usePortfolio } from "~/composables/usePortfolio";
import { useTraderStore } from "~/composables/useTraderStore";
import { useActiveTrade } from "~/composables/useActiveTrade";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { useSupabaseClient, useSupabaseUser } from "#imports";
import { HyperliquidClient } from "~~shared/hyperliquid";
import { handleRequested } from "~/utils/trader/handlers/requested";
import { handleEntrySetUp } from "~/utils/trader/handlers/entrySetUp";
import { handleExitSetup } from "~/utils/trader/handlers/exitSetup";
import type { TraderContext } from "~/utils/trader/types";

export const useTraderHook = () => {
  const userId = useUserId();
  const traderStore = useTraderStore();
  const { wallet, address, clearinghouse, refreshPortfolio } = usePortfolio();
  const { activeTrade, refreshActiveTrade: refresh } = useActiveTrade();
  const { useAllMids, useMetaAndAssetCtxs } = useHyperliquid();
  const hlClient = new HyperliquidClient();

  const { data: allMids } = useAllMids();
  const { data: metaAndAssetCtxs } = useMetaAndAssetCtxs();

  const processTrade = async () => {
    if (
      !userId.value ||
      !wallet.value ||
      !address.value ||
      !clearinghouse.value ||
      !allMids.value ||
      !metaAndAssetCtxs.value
    ) {
      traderStore.setMonitoring(false);
      return;
    }

    // Refresh the active trade data
    await refresh();
    const trade = activeTrade.value;

    if (!trade || trade.status === "sleeping") {
      traderStore.setMonitoring(false);
      return;
    }

    traderStore.setMonitoring(true);

    try {
      const exchangeClient = hlClient.getExchangeClient(wallet.value);

      const ctx: TraderContext = {
        supabase: useSupabaseClient(),
        userId: userId.value,
        traderStore,
        hlClient,
        exchangeClient,
        trade,
        address: address.value,
        refresh: async () => {
          await refresh();
        },
        meta: metaAndAssetCtxs.value[0],
        allMids: allMids.value,
        clearinghouseState: clearinghouse.value,
      };

      if (trade.status === "requested") {
        await handleRequested(ctx);
      } else if (trade.status === "entry_set_up") {
        await handleEntrySetUp(ctx);
      } else if (trade.status === "exit_setup") {
        await handleExitSetup(ctx);
      }

      // Refresh the active trade data after processing a step to update the UI
      await Promise.all([refresh(), refreshPortfolio()]);
    } catch (e: any) {
      const errorMsg = e?.message || "Unknown error occurred";
      traderStore.addLog(`Error processing trade: ${errorMsg}`, "error");
      console.error("Trade processing error:", e);
    }
  };

  const { pause, resume, isActive } = useIntervalFn(processTrade, 60000, {
    immediate: false,
  });

  return {
    isActive,
    pause,
    resume,
    processTrade,
  };
};
