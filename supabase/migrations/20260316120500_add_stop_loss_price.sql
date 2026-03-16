-- Add stop_loss_price column to user_trades
ALTER TABLE public.user_trades ADD COLUMN IF NOT EXISTS stop_loss_price decimal;
