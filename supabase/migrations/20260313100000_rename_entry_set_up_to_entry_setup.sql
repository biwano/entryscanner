-- Rename entry_set_up to entry_setup in user_trades status check
ALTER TABLE public.user_trades DROP CONSTRAINT IF EXISTS user_trades_status_check;

-- Update existing records
UPDATE public.user_trades 
SET status = 'entry_setup' 
WHERE status = 'entry_set_up';

-- Add updated check constraint
ALTER TABLE public.user_trades 
ADD CONSTRAINT user_trades_status_check 
CHECK (status IN ('requested', 'entry_setup', 'exit_setup', 'sleeping'));
