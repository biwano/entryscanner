import type { TraderContext } from "../types";

export const handleExitSetup = async (ctx: TraderContext) => {
  const {
    traderStore,
    trade,
    supabase,
    userId,
    refresh,
    clearinghouseState,
    toast,
  } = ctx;

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

    const { error: statusError } = await supabase
      .from("user_trades")
      .update({ status: "sleeping" })
      .eq("id", userId);

    if (statusError) {
      throw new Error(`Failed to complete trade: ${statusError.message}`);
    }

    await refresh();

    toast.add({
      title: "Trade Completed",
      description: `Position for ${trade.coin} closed. Trade finished successfully.`,
      color: "success",
    });
  }
};
