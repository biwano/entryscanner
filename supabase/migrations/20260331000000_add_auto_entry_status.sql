-- Add auto_entry to user_trades status check constraint
ALTER TABLE public.user_trades DROP CONSTRAINT IF EXISTS user_trades_status_check;

ALTER TABLE public.user_trades 
ADD CONSTRAINT user_trades_status_check 
CHECK (status IN ('requested', 'entry_setup', 'exit_setup', 'sleeping', 'auto_entry'));
