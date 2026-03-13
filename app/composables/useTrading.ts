import { computed } from "vue";
import { useProfile } from "~/composables/useProfile";
import { PrivateKeySigner } from "@nktkas/hyperliquid/signing";
import { HyperliquidClient } from "~~shared/hyperliquid";
import { useAsyncData } from "#app";

export const useTrading = () => {
  const { profile } = useProfile();
  const hlClient = new HyperliquidClient();

  const wallet = computed(() => {
    if (!profile.value?.hl_api_key) return null;
    try {
      return new PrivateKeySigner(profile.value.hl_api_key);
    } catch (e) {
      console.error("Invalid HL API key", e);
      return null;
    }
  });

  const address = computed(() => {
    return profile?.value?.hl_wallet_address ?? null;
  });

  const {
    data: clearinghouse,
    refresh: refreshClearinghouse,
    status: chStatus,
  } = useAsyncData(
    "trading_clearinghouse",
    async () => {
      if (!address.value) return null;
      return await hlClient.fetchClearinghouseState(address.value);
    },
    {
      watch: [address],
    }
  );

  const {
    data: openOrders,
    refresh: refreshOpenOrders,
    status: ooStatus,
  } = useAsyncData(
    "trading_open_orders",
    async () => {
      if (!address.value) return null;
      return await hlClient.fetchOpenOrders(address.value);
    },
    {
      watch: [address],
    }
  );

  const {
    data: fills,
    refresh: refreshFills,
    status: fStatus,
  } = useAsyncData(
    "trading_fills",
    async () => {
      if (!address.value) return null;
      return await hlClient.fetchUserFills(address.value);
    },
    {
      watch: [address],
    }
  );

  const recentTrades = computed(() => {
    if (!fills.value || !Array.isArray(fills.value)) return [];

    const completedTrades: any[] = [];
    const fillsByCoin: Record<string, any[]> = {};

    // Group by coin
    [...fills.value].forEach((fill) => {
      if (!fill || !fill.coin) return;
      if (!fillsByCoin[fill.coin]) fillsByCoin[fill.coin] = [];
      fillsByCoin[fill.coin].push(fill);
    });

    Object.keys(fillsByCoin).forEach((coin) => {
      // Sort fills for this coin oldest to newest
      const coinFills = [...fillsByCoin[coin]].sort((a, b) => a.time - b.time);

      let currentPos = 0;
      let totalPnl = 0;
      let entryPriceSum = 0;
      let entrySizeSum = 0;
      let firstEntryTime = 0;
      let lastExitTime = 0;
      let lastExitPrice = 0;

      coinFills.forEach((fill) => {
        const sz = parseFloat(fill.sz);
        const px = parseFloat(fill.px);
        const sideMult = fill.side === "B" ? 1 : -1;

        // If we're opening or increasing a position
        if (currentPos === 0 || Math.sign(currentPos) === sideMult) {
          if (currentPos === 0) firstEntryTime = fill.time;
          entryPriceSum += px * sz;
          entrySizeSum += sz;
          currentPos += sz * sideMult;
        } else {
          // We're closing or reducing a position
          const avgEntryPx = entryPriceSum / entrySizeSum;
          const reducedSz = Math.min(Math.abs(currentPos), sz);
          const realizedPnl = (px - avgEntryPx) * reducedSz * (currentPos > 0 ? 1 : -1);

          totalPnl += realizedPnl;
          currentPos += sz * sideMult;
          lastExitTime = fill.time;
          lastExitPrice = px;

          // If position fully closed (or flipped)
          if (Math.abs(currentPos) < 1e-8) {
            completedTrades.push({
              coin,
              leverage: "N/A",
              entryTime: new Date(firstEntryTime).toISOString(),
              entryPrice: avgEntryPx,
              exitTime: new Date(lastExitTime).toISOString(),
              exitPrice: lastExitPrice,
              pnl: totalPnl,
              size: entrySizeSum,
            });
            // Reset for next trade
            currentPos = 0;
            totalPnl = 0;
            entryPriceSum = 0;
            entrySizeSum = 0;
            firstEntryTime = 0;
          } else if (Math.sign(currentPos) !== (fill.side === "B" ? 1 : -1) && currentPos !== 0) {
            // Position flipped - close current, start new
            const leftoverSz = Math.abs(currentPos);
            completedTrades.push({
              coin,
              leverage: "N/A",
              entryTime: new Date(firstEntryTime).toISOString(),
              entryPrice: avgEntryPx,
              exitTime: new Date(fill.time).toISOString(),
              exitPrice: px,
              pnl: totalPnl,
              size: entrySizeSum,
            });
            // Start new trade with the leftover size
            currentPos = leftoverSz * sideMult;
            totalPnl = 0;
            entryPriceSum = px * leftoverSz;
            entrySizeSum = leftoverSz;
            firstEntryTime = fill.time;
          }
        }
      });
    });

    // Final mapping to add leverage and sort by exit time
    return completedTrades
      .map((trade) => {
        const position = clearinghouse.value?.assetPositions?.find(
          (p: any) => p?.position?.coin === trade.coin
        );
        const leverage = position ? `${position.position.leverage.value}x` : "N/A";
        return { ...trade, leverage };
      })
      .sort(
        (a, b) =>
          new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime()
      );
  });

  const isLoading = computed(
    () =>
      chStatus.value === "pending" ||
      ooStatus.value === "pending" ||
      fStatus.value === "pending"
  );

  const refreshTrading = async () => {
    await Promise.all([
      refreshClearinghouse(),
      refreshOpenOrders(),
      refreshFills(),
    ]);
  };

  return {
    wallet,
    address,
    clearinghouse,
    openOrders,
    recentTrades,
    isLoading,
    refreshTrading,
  };
};
