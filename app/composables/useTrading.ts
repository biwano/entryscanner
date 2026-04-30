import { computed } from "vue";
import { privateKeyToAccount } from "viem/accounts";
import type { UserFillsResponse } from "@nktkas/hyperliquid/api/info";
import { HyperliquidClient } from "~~shared/hyperliquid.js";
import { useAsyncData } from "#app";
import { useSubAccounts } from "~/composables/useSubAccounts.js";

type UserFill = UserFillsResponse[number];
type FillSide = UserFill["side"];

type CompletedTrade = {
  coin: string;
  leverage: string;
  entryTime: string;
  entryPrice: number;
  exitTime: string | null;
  exitPrice: number | null;
  pnl: number | null;
  isOpen: boolean;
  size: number;
};

const isHexPrivateKey = (value: string): value is `0x${string}` => {
  return /^0x[0-9a-fA-F]{64}$/u.test(value);
};

export const useTrading = () => {
  const { activeSubAccount } = useSubAccounts();
  const hlClient = new HyperliquidClient();

  const wallet = computed(() => {
    if (!activeSubAccount.value?.hl_api_key) return null;
    try {
      const key = activeSubAccount.value.hl_api_key;
      const hexKey = key.startsWith("0x") ? key : `0x${key}`;
      if (!isHexPrivateKey(hexKey)) {
        throw new Error("Invalid private key format");
      }
      return privateKeyToAccount(hexKey);
    } catch (e) {
      console.error("Invalid HL API key", e);
      return null;
    }
  });

  const address = computed(() => {
    return activeSubAccount.value?.hl_wallet_address ?? null;
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

    const completedTrades: CompletedTrade[] = [];
    const orderedFills = [...fills.value.slice(0, 15)]
      .filter((fill): fill is UserFill => Boolean(fill?.coin))
      .sort((a, b) => a.time - b.time);

    const contiguousCoinGroups: { coin: string; fills: UserFill[] }[] = [];
    orderedFills.forEach((fill) => {
      const lastGroup = contiguousCoinGroups[contiguousCoinGroups.length - 1];
      if (!lastGroup || lastGroup.coin !== fill.coin) {
        contiguousCoinGroups.push({ coin: fill.coin, fills: [fill] });
        return;
      }

      lastGroup.fills.push(fill);
    });

    contiguousCoinGroups.forEach(({ coin, fills: coinFills }) => {
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
        const side: FillSide = fill.side;
        const sideMult = side === "B" ? 1 : -1;

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
          const realizedPnl =
            (px - avgEntryPx) * reducedSz * (currentPos > 0 ? 1 : -1);

          totalPnl += realizedPnl;
          currentPos += sz * sideMult;
          lastExitTime = fill.time;
          lastExitPrice = px;

          // If position fully closed (or flipped)
          if (Math.abs(currentPos) === 0 || Math.sign(currentPos) == sideMult) {
            completedTrades.push({
              coin,
              leverage: "N/A",
              entryTime: new Date(firstEntryTime).toISOString(),
              entryPrice: avgEntryPx,
              exitTime: new Date(lastExitTime).toISOString(),
              exitPrice: lastExitPrice,
              pnl: totalPnl,
              isOpen: false,
              size: entrySizeSum,
            });
            // Reset for next trade
            const leftoverSz = Math.abs(currentPos);
            currentPos = leftoverSz * sideMult;
            totalPnl = 0;
            entryPriceSum = px * leftoverSz;
            entrySizeSum = leftoverSz;
            firstEntryTime = fill.time;
          }
        }
      });

      if (Math.abs(currentPos) >= 0 && entrySizeSum > 0) {
        completedTrades.push({
          coin,
          leverage: "N/A",
          entryTime: new Date(firstEntryTime).toISOString(),
          entryPrice: entryPriceSum / entrySizeSum,
          exitTime: null,
          exitPrice: null,
          pnl: null,
          isOpen: true,
          size: Math.abs(currentPos),
        });
      }
    });

    // Final mapping to add leverage and sort by exit time
    return completedTrades
      .map((trade) => {
        const position = Array.isArray(clearinghouse.value?.assetPositions)
          ? clearinghouse.value.assetPositions.find(
              (p) => p?.position?.coin === trade.coin
            )
          : undefined;
        const leverageValue = position?.position?.leverage?.value || null;
        const leverage = leverageValue ? `${leverageValue}x` : "N/A";

        let pnlPct: number | null = null;
        if (!trade.isOpen && trade.pnl !== null && leverageValue) {
          const margin = (trade.size * trade.entryPrice) / leverageValue;
          pnlPct = (trade.pnl / margin) * 100;
        } else if (
          !trade.isOpen &&
          trade.pnl !== null &&
          trade.exitPrice !== null
        ) {
          // Fallback to simple price change %
          const p = (trade.exitPrice - trade.entryPrice) / trade.entryPrice;
          pnlPct = p * 100;
        }

        return { ...trade, leverage, pnlPct };
      })
      .sort(
        (a, b) =>
          new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
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
    hlClient, // Export hlClient
  };
};
