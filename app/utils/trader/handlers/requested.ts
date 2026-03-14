import type { TraderContext } from "../types";
import { formatPriceNumber } from "~/utils/format";

export const handleRequested = async (ctx: TraderContext) => {
  const {
    traderStore,
    trade,
    exchangeClient,
    supabase,
    userId,
    refresh,
    meta,
    allMids,
    clearinghouseState,
    toast,
  } = ctx;

  if (!trade.coin) {
    throw new Error("No coin specified for trade");
  }

  if (clearinghouseState.assetPositions.length) {
    traderStore.addLog(`Position already exists. Skipping trade.`, "info");
    await supabase
      .from("user_trades")
      .update({ status: "sleeping" })
      .eq("id", userId);
    await refresh();
  }

  traderStore.addLog(`Processing requested trade for ${trade.coin}`, "info");

  const assetInfo = meta.universe.find((u) => u.name === trade.coin);

  if (!assetInfo) {
    throw new Error(`Asset ${trade.coin} not found in Hyperliquid universe`);
  }

  const assetIndex = meta.universe.indexOf(assetInfo);

  // 1. Set leverage (9.5x if supported, otherwise 95% of max)
  const maxLeverage = assetInfo.maxLeverage || 50;
  const targetLeverage = maxLeverage >= 10 ? 9.5 : maxLeverage * 0.95;

  traderStore.addLog(
    `Setting ${targetLeverage.toFixed(1)}x leverage for ${trade.coin}`,
    "info"
  );
  await exchangeClient.updateLeverage({
    asset: assetIndex,
    isCross: true,
    leverage: maxLeverage,
  });

  // 2. Place limit order very close to current price
  const priceStr = allMids[trade.coin];
  const currentPrice = priceStr ? parseFloat(priceStr) : null;

  if (!currentPrice) {
    throw new Error(`Could not get current price for ${trade.coin}`);
  }

  // Calculate size: Account Value * targetLeverage
  const accountValue = parseFloat(
    clearinghouseState.marginSummary.accountValue
  );
  const calculatedSizeUsd = accountValue * targetLeverage;

  if (calculatedSizeUsd <= 0) {
    throw new Error("Insufficient capital for trade");
  }

  // Place order slightly offset to ensure fill (0.05%)
  const price =
    trade.direction === "long" ? currentPrice * 1.0005 : currentPrice * 0.9995;

  const size = calculatedSizeUsd / price;

  // Ensure size is formatted with correct decimals
  const szDecimals = assetInfo.szDecimals;
  const formattedSize = size.toFixed(szDecimals);
  const formattedPrice = price.toFixed(5);

  traderStore.addLog(
    `Placing ${trade.direction} limit order for ${
      trade.coin
    } at ${formatPriceNumber(price)} (Size: $${calculatedSizeUsd.toFixed(2)})`,
    "info"
  );

  await exchangeClient.order({
    orders: [
      {
        a: assetIndex,
        b: trade.direction === "long",
        p: formattedPrice,
        s: formattedSize,
        r: false,
        t: { limit: { tif: "Gtc" } },
      },
    ],
    grouping: "na",
  });

  // 3. Update status to entry_setup
  await supabase
    .from("user_trades")
    .update({ status: "entry_setup" })
    .eq("id", userId);

  await refresh();

  toast.add({
    title: "Order Placed",
    description: `Limit ${trade.direction} order for ${trade.coin} placed at ${formattedPrice}`,
    color: "success",
  });

  traderStore.addLog(
    `Trade status updated to entry_setup for ${trade.coin}`,
    "success"
  );
};
