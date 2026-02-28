-- 1. Update trends table to use (coin, timeframe) as primary key
-- First, ensure no duplicates (should already be clean from previous migration, but let's be safe)
DELETE FROM public.trends
WHERE id NOT IN (
    SELECT DISTINCT ON (coin, timeframe) id
    FROM public.trends
    ORDER BY coin, timeframe, timestamp DESC
);

-- Drop the old primary key and the id column
ALTER TABLE public.trends DROP CONSTRAINT IF EXISTS trends_pkey;
ALTER TABLE public.trends DROP COLUMN IF EXISTS id;

-- Add the new composite primary key
ALTER TABLE public.trends ADD PRIMARY KEY (coin, timeframe);

-- 2. Update monitored_pairs table to use coin as primary key
-- Drop the old primary key and the id column
-- Note: No other tables should be referencing monitored_pairs.id by UUID.
ALTER TABLE public.monitored_pairs DROP CONSTRAINT IF EXISTS monitored_pairs_pkey;
ALTER TABLE public.monitored_pairs DROP COLUMN IF EXISTS id;

-- Add the new primary key
ALTER TABLE public.monitored_pairs ADD PRIMARY KEY (coin);

-- 3. Ensure foreign keys to events have ON DELETE SET NULL
-- These were added in the previous migration, but let's ensure they have the correct cascade behavior
ALTER TABLE public.monitored_pairs 
DROP CONSTRAINT IF EXISTS fk_last_trend_daily,
DROP CONSTRAINT IF EXISTS fk_last_trend_weekly;

ALTER TABLE public.monitored_pairs
ADD CONSTRAINT fk_last_trend_daily 
FOREIGN KEY (last_trend_flip_daily_id) REFERENCES public.events(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_last_trend_weekly 
FOREIGN KEY (last_trend_flip_weekly_id) REFERENCES public.events(id) ON DELETE SET NULL;

-- 4. Ensure notification_history.event_id has ON DELETE SET NULL
ALTER TABLE public.notification_history
DROP CONSTRAINT IF EXISTS notification_history_event_id_fkey;

ALTER TABLE public.notification_history
ADD CONSTRAINT notification_history_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;
