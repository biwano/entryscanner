import { getSupabaseServiceClient } from "../utils/supabase-service.js";
import { HyperliquidClient } from "~~shared/hyperliquid.js";
import { processTimeframe } from "../utils/trend-worker.js";
import type { TablesInsert } from "~/types/database.types.js";
import dayjs from "dayjs";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const coin = typeof query.coin === "string" ? query.coin : undefined;
  const timeframe =
    query.timeframe === "D1" || query.timeframe === "W1"
      ? query.timeframe
      : undefined;

  if (!coin || !timeframe) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing 'coin' or 'timeframe' query parameter",
    });
  }

  const supabase = getSupabaseServiceClient();
  const client = new HyperliquidClient();

  const updates: TablesInsert<"monitored_pairs"> = {
    coin,
    last_analyzed: dayjs().toISOString(),
  };

  const result = await processTimeframe(
    supabase,
    client,
    coin,
    timeframe,
    updates
  );

  return {
    status: "success",
    coin,
    timeframe,
    updates,
    lastClosedCandle: "lastClosedCandle" in result ? result.lastClosedCandle : null,
    processResult: result,
  };
});
