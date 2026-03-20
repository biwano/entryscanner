-- Add leverage column to user_trades table
ALTER TABLE public.user_trades 
ADD COLUMN IF NOT EXISTS leverage NUMERIC DEFAULT 10;
