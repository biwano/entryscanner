import type { TraderContext } from "../types";
import { calculateSMA, calculateStartTime } from "~~shared/trends";
import { SMA_PERIOD_FAST } from "~~shared/constants";

export const handleAutoEntry = async (ctx: TraderContext) => {
  const {
    hlClient,
    trade,
    traderStore,
    allMids,
    supabase,
    userId,
    refresh,
    toast,
  } = ctx;

  if (!trade.coin) {
    throw new Error("No coin specified for trade");
  }

  // 1. Get current price
  const currentPriceStr = allMids[trade.coin];
  if (!currentPriceStr) {
    traderStore.addLog(
      `Could not get current price for ${trade.coin}. Retrying...`,
      "warning"
    );
    return;
  }
  const currentPrice = parseFloat(currentPriceStr);

  // 2. Fetch Hourly candles for SMA 50
  // We fetch slightly more than the period to ensure we have enough data
  const startTime = calculateStartTime("H1", SMA_PERIOD_FAST + 10);
  const candles = await hlClient.fetchCandles(trade.coin, "1h", startTime);

  if (candles.length < SMA_PERIOD_FAST) {
    traderStore.addLog(
      `Not enough H1 candles (${candles.length}/${SMA_PERIOD_FAST}) for ${trade.coin}`,
      "warning"
    );
    return;
  }

  // 3. Calculate SMA 50
  const closePrices = candles.map((c) => parseFloat(c.c));
  const smas = calculateSMA(closePrices, SMA_PERIOD_FAST);

  // Last closed candle is the one before the current in-progress candle
  const lastClosedCandle = candles[candles.length - 2];
  const lastClosedSma = smas[smas.length - 2];

  if (!lastClosedCandle || lastClosedSma === undefined) {
    traderStore.addLog(
      `Failed to find last closed candle or SMA 50 for ${trade.coin}`,
      "error"
    );
    return;
  }

  const lastClosedOpen = parseFloat(lastClosedCandle.o);
  const lastClosedClose = parseFloat(lastClosedCandle.c);

  const isLong = trade.direction === "long";
  const isShort = trade.direction === "short";
  const diff = lastClosedClose - lastClosedSma;
  const diffPct = (diff / lastClosedSma) * 100;

  // 4. Check trigger condition (Crossover on closed candle)
  let trigger = false;
  if (isLong) {
    // Cross UP: Open <= SMA AND Close > SMA
    if (lastClosedOpen <= lastClosedSma && lastClosedClose > lastClosedSma) {
      trigger = true;
    }
  } else if (isShort) {
    // Cross DOWN: Open >= SMA AND Close < SMA
    if (lastClosedOpen >= lastClosedSma && lastClosedClose < lastClosedSma) {
      trigger = true;
    }
  }

  // 5. Log the decision making
  const directionText = isLong ? "Long" : "Short";
  const conditionText = isLong ? "Cross UP SMA 50" : "Cross DOWN SMA 50";
  const statusIcon = trigger ? "✅" : "⏳";

  traderStore.addLog(
    `${statusIcon} ${
      trade.coin
    } (${directionText}): Last Candle Open=$${lastClosedOpen.toFixed(
      4
    )}, Close=$${lastClosedClose.toFixed(4)}, SMA50=$${lastClosedSma.toFixed(
      4
    )} (Diff: ${diffPct.toFixed(2)}%). Current Mid=$${currentPrice.toFixed(
      4
    )}. Waiting for ${conditionText}`,
    trigger ? "success" : "info",
    statusIcon
  );

  // 6. Transition to requested status if triggered
  if (trigger) {
    traderStore.addLog(
      `Auto Entry condition met for ${trade.coin}! Transitioning to requested status.`,
      "success"
    );

    const { error: statusError } = await supabase
      .from("user_trades")
      .update({ status: "requested" })
      .eq("id", userId);

    if (statusError) {
      throw new Error(
        `Failed to transition from auto_entry to requested: ${statusError.message}`
      );
    }

    await refresh();

    toast.add({
      title: "Auto Entry Triggered",
      description: `${trade.coin} ${trade.direction} trade is now being placed.`,
      color: "success",
    });
  }
};
