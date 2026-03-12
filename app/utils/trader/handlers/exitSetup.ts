import type { TraderContext } from "../types";

export const handleExitSetup = async (ctx: TraderContext) => {
  const { traderStore, trade, supabase, userId, refresh, clearinghouseState } =
    ctx;

  if (!trade.coin) {
    throw new Error("No coin specified for trade");
  }

  const position = clearinghouseState.assetPositions.find(
    (p) => p.position.coin === trade.coin
  );

  if (!position || parseFloat(position.position.szi) === 0) {
    traderStore.addLog(
      `Position closed for ${trade.coin}. Trade complete.`,
      "success"
    );

    await supabase
      .from("user_trades")
      .update({ status: "sleeping" })
      .eq("id", userId);

    await refresh();

    traderStore.setMonitoring(false);
  }
};
