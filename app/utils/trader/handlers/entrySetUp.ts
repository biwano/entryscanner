import type { TraderContext } from "../types";

export const handleEntrySetUp = async (ctx: TraderContext) => {
  const {
    traderStore,
    trade,
    exchangeClient,
    supabase,
    userId,
    refresh,
    meta,
    clearinghouseState,
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

    // Calculate SL: loss % of capital (margin)
    const priceMovePct = trade.stop_loss_pct / 100 / 10;
    const slPrice =
      trade.direction === "long"
        ? entryPrice * (1 - priceMovePct)
        : entryPrice * (1 + priceMovePct);

    // Calculate TP
    let tpPrice = trade.take_profit_price;
    if (!tpPrice) {
      const tpPricePct = trade.take_profit_pct / 100 / 10;
      tpPrice =
        trade.direction === "long"
          ? entryPrice * (1 + tpPricePct)
          : entryPrice * (1 - tpPricePct);
    }

    const formattedSL = slPrice.toFixed(4);
    const formattedTP = tpPrice.toFixed(4);
    const posSize = Math.abs(parseFloat(position.position.szi)).toString();

    traderStore.addLog(
      `Setting SL at ${formattedSL} and TP at ${formattedTP}`,
      "info"
    );

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

    await supabase
      .from("user_trades")
      .update({ status: "exit_setup" })
      .eq("id", userId);

    await refresh();

    traderStore.addLog(
      `Exit orders set up for ${trade.coin}. Status: exit_setup`,
      "success"
    );
  }
};
