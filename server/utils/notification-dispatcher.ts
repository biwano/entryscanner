import type { NotificationWithDetails } from "~/types/database.friendly.types";
import { getSupabaseServiceClient } from "./supabase-service";
import dayjs from "dayjs";

export async function runNotificationDispatcher() {
  const supabase = getSupabaseServiceClient();

  // 1. Notification Generation
  // Select all events where notifications_created is false
  const { data: unprocessedEvents, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .eq("notifications_created", false)
    .order("created_at", { ascending: true });

  if (eventsError) {
    console.error("Error fetching unprocessed events:", eventsError);
  } else if (unprocessedEvents && unprocessedEvents.length > 0) {
    for (const event of unprocessedEvents) {
      // Find all active users with a subscription to this coin/timeframe
      const { data: subscriptions, error: subError } = await supabase
        .from("user_subscriptions")
        .select(`
          user_id,
          coin,
          timeframe,
          monitored_pairs!inner(active)
        `)
        .eq("coin", event.coin)
        .eq("timeframe", event.timeframe)
        .eq("monitored_pairs.active", true);

      if (subError) {
        console.error(`Error fetching subscriptions for event ${event.id}:`, subError);
        continue;
      }

      if (subscriptions && subscriptions.length > 0) {
        const message = `${event.coin} ${event.timeframe} trend flipped to **${event.status.toUpperCase()}**!`;
        const notificationsToInsert = (subscriptions as unknown as { user_id: string }[]).map((sub) => ({
          user_id: sub.user_id,
          event_id: event.id,
          message,
          sent_at: null,
        }));

        const { error: insertError } = await supabase
          .from("notification_history")
          .insert(notificationsToInsert);

        if (insertError) {
          console.error(`Error creating notification history for event ${event.id}:`, insertError);
          continue;
        }
      }

      // Mark event as processed
      await supabase
        .from("events")
        .update({ notifications_created: true })
        .eq("id", event.id);
    }
  }

  // 2. Notification Dispatching
  // Select all not sent elements of notification history
  const { data: pendingNotifications, error: pendingError } = await supabase
    .from("notification_history")
    .select(`
      *,
      profiles:user_id (discord_webhook_url),
      events:event_id (*)
    `)
    .is("sent_at", null)
    .returns<NotificationWithDetails[]>();

  if (pendingError) {
    return { status: "error", error: pendingError };
  }

  const sent = [];
  if (pendingNotifications && pendingNotifications.length > 0) {
    for (const notif of pendingNotifications) {
      const profile = notif.profiles;
      const event = notif.events;
      const webhookUrl = profile?.discord_webhook_url;

      if (!webhookUrl || !event) {
        // Mark as sent anyway if we can't send it (e.g. no webhook) to avoid retry loops
        // but log it if event is missing
        if (!event) console.error(`Missing event for notification ${notif.id}`);
        
        await supabase
          .from("notification_history")
          .update({ 
            sent_at: new Date().toISOString(),
          })
          .eq("id", notif.id);
        continue;
      }

      try {
        await $fetch(webhookUrl, {
          method: "POST",
          body: {
            content: notif.message,
            embeds: [
              {
                title: `Trend Flip Alert: ${event.coin}`,
                description: notif.message,
                color: event.status === "bullish" ? 0x00ff00 : 0xff0000,
                timestamp: dayjs(event.since).toISOString(),
              },
            ],
          },
        });

        await supabase
          .from("notification_history")
          .update({
            sent_at: new Date().toISOString(),
          })
          .eq("id", notif.id);

        sent.push({ user_id: notif.user_id, event_id: notif.event_id });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`Dispatcher error for notification ${notif.id}:`, errorMsg);
        // We don't mark as sent here, it will be retried next time
      }
    }
  }

  return { status: "ok", sent: sent.length };
}
