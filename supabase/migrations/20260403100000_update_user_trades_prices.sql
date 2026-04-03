-- Remove take_profit_pct and stop_loss_pct columns
ALTER TABLE public.user_trades DROP COLUMN IF EXISTS take_profit_pct;
ALTER TABLE public.user_trades DROP COLUMN IF EXISTS stop_loss_pct;

-- Update existing NULL prices to a default (0) before making them NOT NULL
UPDATE public.user_trades SET take_profit_price = 0 WHERE take_profit_price IS NULL;
UPDATE public.user_trades SET stop_loss_price = 0 WHERE stop_loss_price IS NULL;

-- Make take_profit_price and stop_loss_price NOT NULL
ALTER TABLE public.user_trades ALTER COLUMN take_profit_price SET NOT NULL;
ALTER TABLE public.user_trades ALTER COLUMN stop_loss_price SET NOT NULL;
ALTER TABLE public.user_trades ALTER COLUMN take_profit_price SET DEFAULT 0;
ALTER TABLE public.user_trades ALTER COLUMN stop_loss_price SET DEFAULT 0;
