-- Update monitored_pairs constraints
ALTER TABLE public.monitored_pairs 
DROP CONSTRAINT IF EXISTS fk_last_trend_daily,
DROP CONSTRAINT IF EXISTS fk_last_trend_weekly;

ALTER TABLE public.monitored_pairs
ADD CONSTRAINT fk_last_trend_daily 
FOREIGN KEY (last_trend_flip_daily_id) REFERENCES public.trends(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_last_trend_weekly 
FOREIGN KEY (last_trend_flip_weekly_id) REFERENCES public.trends(id) ON DELETE SET NULL;

-- Update notification_history constraints
ALTER TABLE public.notification_history 
DROP CONSTRAINT IF EXISTS notification_history_trend_id_fkey;

ALTER TABLE public.notification_history
ADD CONSTRAINT notification_history_trend_id_fkey 
FOREIGN KEY (trend_id) REFERENCES public.trends(id) ON DELETE SET NULL;
