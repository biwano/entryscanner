-- Add since column to public.events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS since TIMESTAMPTZ;

-- Populate since with timestamp for existing records
UPDATE public.events SET since = timestamp WHERE since IS NULL;

-- Ensure foreign key constraint for notification_history event_id
ALTER TABLE public.notification_history 
DROP CONSTRAINT IF EXISTS notification_history_event_id_fkey,
ADD CONSTRAINT notification_history_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;
