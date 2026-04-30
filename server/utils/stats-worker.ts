import { getSupabaseServiceClient } from "./supabase-service.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import type { StatInsert } from "~/types/database.friendly.types.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database.types.js";

dayjs.extend(utc);

/**
 * Finds the next day for which stats should be computed.
 */
async function getNextTargetDay(
  supabase: SupabaseClient<Database>
): Promise<string | null> {
  // 1. Find last stat date
  const { data: lastStat, error: lastStatError } = await supabase
    .from("stats")
    .select("day")
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastStatError) throw lastStatError;

  if (!lastStat) {
    // If no stats exist: find the earliest day with a trend event
    const { data: firstEvent, error: firstEventError } = await supabase
      .from("events")
      .select("since")
      .order("since", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstEventError) throw firstEventError;
    if (!firstEvent || !firstEvent.since) return null;

    return dayjs.utc(firstEvent.since).startOf("day").toISOString();
  } else {
    // If stats exist: find the day of the first event that occurs after the day of the last existing stat
    const lastStatDayEnd = dayjs.utc(lastStat.day).endOf("day").toISOString();

    const { data: nextEvent, error: nextEventError } = await supabase
      .from("events")
      .select("since")
      .gt("since", lastStatDayEnd)
      .order("since", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextEventError) throw nextEventError;
    if (!nextEvent || !nextEvent.since) return null;

    return dayjs.utc(nextEvent.since).startOf("day").toISOString();
  }
}

/**
 * Computes market-wide stats for a specific day by taking a snapshot of all active trends at the end of that day.
 */
async function computeStatsForDay(
  supabase: SupabaseClient<Database>,
  targetDay: string
): Promise<StatInsert | null> {
  const endOfTargetDay = dayjs.utc(targetDay).endOf("day").toISOString();

  // Fetch all relevant events up to the end of the target day
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("coin, timeframe, status, since")
    .lte("since", endOfTargetDay)
    .order("since", { ascending: false });

  if (eventsError) throw eventsError;
  if (!events || events.length === 0) return null;

  // Process events to get the latest status for each (coin, timeframe)
  const latestStatuses = new Map<
    string,
    { coin: string; timeframe: string; status: string; since: string | null }
  >();
  const uniqueCoins = new Set<string>();

  for (const event of events) {
    const key = `${event.coin}-${event.timeframe}`;
    if (!latestStatuses.has(key)) {
      latestStatuses.set(key, event);
      uniqueCoins.add(event.coin);
    }
  }

  const pairs_total = uniqueCoins.size;
  let pairs_bullish_daily = 0;
  let pairs_bearish_daily = 0;
  let pairs_bullish_weekly = 0;
  let pairs_bearish_weekly = 0;

  for (const status of latestStatuses.values()) {
    if (status.timeframe === "D1") {
      if (status.status === "bullish") pairs_bullish_daily++;
      else pairs_bearish_daily++;
    } else if (status.timeframe === "W1") {
      if (status.status === "bullish") pairs_bullish_weekly++;
      else pairs_bearish_weekly++;
    }
  }

  return {
    day: targetDay,
    pairs_total,
    pairs_bullish_daily,
    pairs_bearish_daily,
    pairs_bullish_weekly,
    pairs_bearish_weekly,
  };
}

/**
 * Main worker function that runs iteratively until all pending days are processed.
 */
export async function runStatsWorker() {
  const supabase = getSupabaseServiceClient();
  const processedDays = [];

  while (true) {
    try {
      // 1. Determine next target day
      const targetDay = await getNextTargetDay(supabase);

      if (!targetDay) {
        return {
          status: "completed",
          message: "No more events to process",
          processedDays,
        };
      }

      // 2. Validation: If the target day is today (UTC) or later, stop.
      const today = dayjs.utc().startOf("day");
      const targetDayObj = dayjs.utc(targetDay).startOf("day");

      if (targetDayObj.isSame(today) || targetDayObj.isAfter(today)) {
        return {
          status: "skipped",
          message: `Reached current day or future: ${targetDay}. Stopped.`,
          processedDays,
        };
      }

      // 3. Compute stats for the target day
      const stat = await computeStatsForDay(supabase, targetDay);

      if (!stat) {
        return {
          status: "error",
          message: `Could not compute stats for ${targetDay} even though an event was found.`,
          processedDays,
        };
      }

      // 4. Persistence
      const { error: insertError } = await supabase.from("stats").upsert(stat);
      if (insertError) throw insertError;

      processedDays.push({ day: targetDay, stat });
      console.info(`Successfully computed and saved stats for ${targetDay}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error in Stats Worker loop:", error);
      return {
        status: "error",
        message: message || "An unexpected error occurred",
        error,
        processedDays,
      };
    }
  }
}
