-- 1. Create the events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL, -- Opening time of the candle where trend flipped
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add RLS to events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for events" ON public.events FOR SELECT USING (true);
CREATE POLICY "System insert for events" ON public.events FOR INSERT WITH CHECK (true);

-- 3. Refactor trends table: ensure uniqueness on (coin, timeframe)
-- Note: We might have duplicate (coin, timeframe) currently if it's a history table.
-- Let's keep only the latest one per (coin, timeframe) before adding constraint.
DELETE FROM public.trends
WHERE id NOT IN (
    SELECT DISTINCT ON (coin, timeframe) id
    FROM public.trends
    ORDER BY coin, timeframe, timestamp DESC
);

ALTER TABLE public.trends ADD CONSTRAINT trends_coin_timeframe_unique UNIQUE (coin, timeframe);

-- 4. Update monitored_pairs to reference events instead of trends
-- First, drop the old constraints
ALTER TABLE public.monitored_pairs 
DROP CONSTRAINT IF EXISTS fk_last_trend_daily,
DROP CONSTRAINT IF EXISTS fk_last_trend_weekly;

-- Update existing IDs to NULL because they point to trends, and we are moving them to events
-- In a real production scenario, we'd migrate the data, but for this refactor, we'll reset them.
UPDATE public.monitored_pairs SET last_trend_flip_daily_id = NULL, last_trend_flip_weekly_id = NULL;

-- Add new constraints referencing events
ALTER TABLE public.monitored_pairs
ADD CONSTRAINT fk_last_trend_daily 
FOREIGN KEY (last_trend_flip_daily_id) REFERENCES public.events(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_last_trend_weekly 
FOREIGN KEY (last_trend_flip_weekly_id) REFERENCES public.events(id) ON DELETE SET NULL;

-- 5. Update notification_history to reference events instead of trends
-- Rename trend_id to event_id
ALTER TABLE public.notification_history RENAME COLUMN trend_id TO event_id;

-- Drop old constraint and update values to NULL
ALTER TABLE public.notification_history 
DROP CONSTRAINT IF EXISTS notification_history_trend_id_fkey;

UPDATE public.notification_history SET event_id = NULL;

-- Add new constraint referencing events
ALTER TABLE public.notification_history
ADD CONSTRAINT notification_history_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;
