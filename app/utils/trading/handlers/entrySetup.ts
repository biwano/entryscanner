import type { TraderContext } from "../types";
import { formatPriceForHL } from "~/utils/format";

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

    // Use prices from trade record
    const slPrice = trade.stop_loss_price;
    const tpPrice = trade.take_profit_price;

    const szDecimals = assetInfo.szDecimals;
    const posSize = Math.abs(parseFloat(position.position.szi)).toString();

    type TriggerOrder = {
      a: number;
      b: boolean;
      p: string;
      s: string;
      r: true;
      t: {
        trigger: {
          isMarket: true;
          triggerPx: string;
          tpsl: "sl" | "tp";
        };
      };
    };

    const orders: TriggerOrder[] = [];

    if (slPrice > 0) {
      const formattedSL = formatPriceForHL(slPrice, szDecimals);
      orders.push({
        a: assetIndex,
        b: trade.direction !== "long",
        p: formattedSL,
        s: posSize,
        r: true,
        t: {
          trigger: { isMarket: true, triggerPx: formattedSL, tpsl: "sl" },
        },
      });
      traderStore.addLog(`Setting SL at ${formattedSL}`, "info");
    } else {
      traderStore.addLog(
        `No SL price set for ${trade.coin}, skipping SL order`,
        "warning"
      );
    }

    if (tpPrice > 0) {
      const formattedTP = formatPriceForHL(tpPrice, szDecimals);
      orders.push({
        a: assetIndex,
        b: trade.direction !== "long",
        p: formattedTP,
        s: posSize,
        r: true,
        t: {
          trigger: { isMarket: true, triggerPx: formattedTP, tpsl: "tp" },
        },
      });
      traderStore.addLog(`Setting TP at ${formattedTP}`, "info");
    } else {
      traderStore.addLog(
        `No TP price set for ${trade.coin}, skipping TP order`,
        "warning"
      );
    }

    // Cancel existing trigger orders for this coin before placing new ones
    const openOrders = await hlClient.fetchOpenOrders(address);
    const triggerOrders = openOrders.filter(
      (o) =>
        o.coin === trade.coin &&
        o.reduceOnly === true &&
        typeof o.oid === "number"
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

    // Place SL and TP trigger orders if any
    if (orders.length > 0) {
      await exchangeClient.order({
        orders,
        grouping: "na",
      });
    }

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
