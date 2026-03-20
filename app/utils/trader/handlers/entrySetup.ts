import type { TraderContext } from "../types";
import { formatPriceNumber } from "~/utils/format";

export const handleEntrySetup = async (ctx: TraderContext) => {
  const {
    traderStore,
    trade,
    hlClient,
    address,
    exchangeClient,
    supabase,
    userId,
    refresh,
    meta,
    clearinghouseState,
    toast,
  } = ctx;

  if (!trade.coin) {
    throw new Error("No coin specified for trade");
  }

  const position = clearinghouseState.assetPositions.find(
    (p) => p.position.coin === trade.coin
  );

  if (position && parseFloat(position.position.szi) !== 0) {
    const entryPrice = parseFloat(position.position.entryPx);
    traderStore.addLog(
      `Position detected for ${trade.coin} at ${entryPrice}`,
      "info"
    );

    const assetInfo = meta.universe.find((u) => u.name === trade.coin);
    if (!assetInfo) throw new Error(`Asset ${trade.coin} not found`);
    const assetIndex = meta.universe.indexOf(assetInfo);

    const leverage = position.position.leverage.value;

    // Calculate SL
    let slPrice = trade.stop_loss_price;
    if (!slPrice) {
      const priceMovePct = trade.stop_loss_pct / 100 / leverage;
      slPrice =
        trade.direction === "long"
          ? entryPrice * (1 - priceMovePct)
          : entryPrice * (1 + priceMovePct);
    }

    // Calculate TP
    let tpPrice = trade.take_profit_price;
    if (!tpPrice) {
      const tpPricePct = trade.take_profit_pct / 100 / leverage;
      tpPrice =
        trade.direction === "long"
          ? entryPrice * (1 + tpPricePct)
          : entryPrice * (1 - tpPricePct);
    }

    const formattedSL = slPrice.toFixed(5);
    const formattedTP = tpPrice.toFixed(5);
    const posSize = Math.abs(parseFloat(position.position.szi)).toString();

    traderStore.addLog(
      `Setting SL at ${formatPriceNumber(slPrice)} and TP at ${formatPriceNumber(tpPrice)}`,
      "info"
    );

    // Cancel existing trigger orders for this coin before placing new ones
    const openOrders = await hlClient.fetchOpenOrders(address);
    const triggerOrders = openOrders.filter(
      (o: any) => o.coin === trade.coin && o.isTrigger
    );

    if (triggerOrders.length > 0) {
      traderStore.addLog(
        `Cancelling ${triggerOrders.length} existing trigger orders for ${trade.coin}`,
        "info"
      );
      for (const order of triggerOrders) {
        await exchangeClient.cancel({
          cancels: [
            {
              a: assetIndex,
              o: order.oid,
            },
          ],
        });
      }
    }

    // Place SL and TP trigger orders
    await exchangeClient.order({
      orders: [
        {
          a: assetIndex,
          b: trade.direction !== "long",
          p: formattedSL,
          s: posSize,
          r: true,
          t: {
            trigger: { isMarket: true, triggerPx: formattedSL, tpsl: "sl" },
          },
        },
        {
          a: assetIndex,
          b: trade.direction !== "long",
          p: formattedTP,
          s: posSize,
          r: true,
          t: {
            trigger: { isMarket: true, triggerPx: formattedTP, tpsl: "tp" },
          },
        },
      ],
      grouping: "na",
    });

    const { error: statusError } = await supabase
      .from("user_trades")
      .update({ status: "exit_setup" })
      .eq("id", userId);

    if (statusError) {
      throw new Error(
        `Failed to set trade to exit_setup: ${statusError.message}`
      );
    }

    await refresh();

    toast.add({
      title: "Position Detected",
      description: `Position for ${trade.coin} opened at ${entryPrice}. SL/TP orders placed.`,
      color: "success",
    });

    traderStore.addLog(
      `Exit orders set up for ${trade.coin}. Status: exit_setup`,
      "success"
    );
  }
};
