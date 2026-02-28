-- Add foreign key constraint from user_subscriptions.coin to monitored_pairs.coin
-- This enables PostgREST joins using the 'coin' column

ALTER TABLE public.user_subscriptions
ADD CONSTRAINT user_subscriptions_coin_fkey 
FOREIGN KEY (coin) REFERENCES public.monitored_pairs(coin) 
ON DELETE CASCADE;
