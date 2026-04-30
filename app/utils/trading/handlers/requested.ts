import type { TraderContext } from "../types";
import { formatPriceNumber, formatPriceForHL } from "~/utils/format";

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
    const { error: sleepError } = await supabase
      .from("user_trades")
      .update({ status: "sleeping" })
      .eq("id", userId);
    if (sleepError) {
      throw new Error(`Failed to skip trade: ${sleepError.message}`);
    }
    await refresh();
    return;
  }

  traderStore.addLog(`Processing requested trade for ${trade.coin}`, "info");

  const assetInfo = meta.universe.find((u) => u.name === trade.coin);

  if (!assetInfo) {
    throw new Error(`Asset ${trade.coin} not found in Hyperliquid universe`);
  }

  const assetIndex = meta.universe.findIndex((u) => u.name === trade.coin);
  if (assetIndex < 0) {
    throw new Error(
      `Invalid Hyperliquid asset index for ${trade.coin}. Unable to continue trade request.`
    );
  }

  // 1. Set leverage from trade record
  const leverage = trade.leverage || 10;
  // Hyperliquid updateLeverage requires an integer.
  // We round up to ensure the configured leverage is possible.
  const leverageInt = Math.ceil(leverage);

  traderStore.addLog(
    `Setting ${leverageInt}x account leverage (Target: ${leverage.toFixed(
      1
    )}x) for ${trade.coin}`,
    "info"
  );
  await exchangeClient.updateLeverage({
    asset: assetIndex,
    isCross: true,
    leverage: leverageInt,
  });

  // 2. Place limit order very close to current price
  const priceStr = allMids[trade.coin];
  const currentPrice = priceStr ? parseFloat(priceStr) : null;

  if (!currentPrice) {
    throw new Error(`Could not get current price for ${trade.coin}`);
  }

  // Calculate size: Account Value * leverage
  const accountValue = parseFloat(
    clearinghouseState.marginSummary.accountValue
  );
  const calculatedSizeUsd = accountValue * leverage;

  if (calculatedSizeUsd <= 0) {
    throw new Error("Insufficient capital for trade");
  }

  // Place order slightly offset to ensure fill (0.05%)
  const price =
    trade.direction === "long" ? currentPrice * 1.0005 : currentPrice * 0.9995;

  const size = calculatedSizeUsd / price;

  // Ensure size and price are formatted with correct decimals
  const szDecimals = assetInfo.szDecimals;
  const formattedSize = size.toFixed(szDecimals);
  const formattedPrice = formatPriceForHL(price, szDecimals);

  traderStore.addLog(
    `Placing ${trade.direction} limit order for ${
      trade.coin
    } at $${formatPriceNumber(price)} (Size: ${calculatedSizeUsd.toFixed(2)})`,
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

  const { error: statusError } = await supabase
    .from("user_trades")
    .update({ status: "entry_setup" })
    .eq("id", userId);

  if (statusError) {
    throw new Error(
      `Failed to set trade to entry_setup: ${statusError.message}`
    );
  }

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
