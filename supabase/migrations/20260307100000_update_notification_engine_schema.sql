-- Add notifications_created to events
ALTER TABLE public.events ADD COLUMN notifications_created BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark all existing events as having their notifications created to avoid a flood of alerts
UPDATE public.events SET notifications_created = TRUE;

-- Add sent_at to notification_history and remove triggered_at
ALTER TABLE public.notification_history ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;

-- Mark all existing notifications as sent at their triggered_at time or current time
UPDATE public.notification_history SET sent_at = COALESCE(triggered_at, NOW());

-- Drop triggered_at column
ALTER TABLE public.notification_history DROP COLUMN triggered_at;
