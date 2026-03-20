import { useIntervalFn } from "@vueuse/core";
import { useTrading } from "~/composables/useTrading";
import { useTraderStore } from "~/composables/useTraderStore";
import { useActiveTrade } from "~/composables/useActiveTrade";
import { useHyperliquid } from "~/composables/useHyperliquid";
import { useSupabaseClient, useToast } from "#imports";
import { HyperliquidClient } from "~~shared/hyperliquid";
import { handleRequested } from "~/utils/trader/handlers/requested";
import { handleEntrySetup } from "~/utils/trader/handlers/entrySetup";
import { handleExitSetup } from "~/utils/trader/handlers/exitSetup";
import type { TraderContext } from "~/utils/trader/types";

/** Shared across all `useTraderHook()` instances so interval + UI never overlap. */
let processTradeMutex = Promise.resolve();

async function withProcessTradeLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = processTradeMutex;
  let releaseGate!: () => void;
  processTradeMutex = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    releaseGate();
  }
}

export const useTraderHook = () => {
  const userId = useUserId();
  const traderStore = useTraderStore();
  const { wallet, address, clearinghouse, refreshTrading } = useTrading();
  const { activeTrade, refreshActiveTrade } = useActiveTrade();
  const { useAllMids, useMetaAndAssetCtxs } = useHyperliquid();
  const hlClient = new HyperliquidClient();
  const toast = useToast();

  const { data: allMids } = useAllMids();
  const { data: metaAndAssetCtxs } = useMetaAndAssetCtxs();

  const processTrade = async () => {
    await withProcessTradeLock(async () => {
      if (
        !userId.value ||
        !wallet.value ||
        !address.value ||
        !clearinghouse.value ||
        !allMids.value ||
        !metaAndAssetCtxs.value
      ) {
        return;
      }

      await refreshActiveTrade();
      const trade = activeTrade.value;

      if (!trade || trade.status === "sleeping") {
        return;
      }

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
            await refreshActiveTrade();
          },
          meta: metaAndAssetCtxs.value[0],
          allMids: allMids.value,
          clearinghouseState: clearinghouse.value,
          toast,
        };

        if (trade.status === "requested") {
          await handleRequested(ctx);
        } else if (trade.status === "entry_setup") {
          await handleEntrySetup(ctx);
        } else if (trade.status === "exit_setup") {
          await handleExitSetup(ctx);
        }

        await Promise.all([refreshActiveTrade(), refreshTrading()]);
      } catch (e: unknown) {
        const errorMsg =
          e instanceof Error ? e.message : "Unknown error occurred";
        traderStore.addLog(`Error processing trade: ${errorMsg}`, "error");
        console.error("Trade processing error:", e);
        toast.add({
          title: "Trade Error",
          description: errorMsg,
          color: "error",
        });
      }
    });
  };

  const { pause, resume, isActive } = useIntervalFn(processTrade, 10000, {
    immediate: false,
  });

  return {
    isActive,
    pause,
    resume,
    processTrade,
  };
};
