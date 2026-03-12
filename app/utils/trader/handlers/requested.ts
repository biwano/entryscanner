import type { TraderContext } from "../types";

export const handleRequested = async (ctx: TraderContext) => {
  const {
    traderStore,
    trade,
    exchangeClient,
    supabase,
    user,
    refresh,
    meta,
    allMids,
    clearinghouseState,
  } = ctx;

  if (!trade.coin) {
    throw new Error("No coin specified for trade");
  }

  traderStore.addLog(`Processing requested trade for ${trade.coin}`, "info");

  const assetInfo = meta.universe.find((u) => u.name === trade.coin);

  if (!assetInfo) {
    throw new Error(`Asset ${trade.coin} not found in Hyperliquid universe`);
  }

  const assetIndex = meta.universe.indexOf(assetInfo);

  // 1. Set leverage to 10x
  traderStore.addLog(`Setting 10x leverage for ${trade.coin}`, "info");
  await exchangeClient.updateLeverage({
    asset: assetIndex,
    isCross: true,
    leverage: 10,
  });

  // 2. Place limit order very close to current price
  const priceStr = allMids[trade.coin];
  const currentPrice = priceStr ? parseFloat(priceStr) : null;

  if (!currentPrice) {
    throw new Error(`Could not get current price for ${trade.coin}`);
  }

  // Calculate size: Account Value * 10
  const accountValue = parseFloat(clearinghouseState.marginSummary.accountValue);
  const calculatedSizeUsd = accountValue * 10;

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
  const formattedPrice = price.toFixed(4);

  traderStore.addLog(
    `Placing ${trade.direction} limit order for ${
      trade.coin
    } at ${formattedPrice} (Size: $${calculatedSizeUsd.toFixed(2)})`,
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

  // 3. Update status to entry_set_up
  await supabase
    .from("user_trades")
    .update({ status: "entry_set_up" })
    .eq("id", user.id);

  await refresh();

  traderStore.addLog(
    `Trade status updated to entry_set_up for ${trade.coin}`,
    "success"
  );
};
