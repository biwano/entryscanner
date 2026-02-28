-- Enable RLS
-- (Note: In Supabase, RLS is enabled on each table specifically)

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  wallet_address TEXT,
  discord_webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  coin TEXT NOT NULL,
  timeframe TEXT CHECK (timeframe IN ('D1', 'W1')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, coin, timeframe)
);

-- Monitored Pairs Table
CREATE TABLE IF NOT EXISTS public.monitored_pairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coin TEXT NOT NULL UNIQUE,
  last_trend_flip_daily_id UUID, -- Reference to trends.id
  last_trend_flip_weekly_id UUID, -- Reference to trends.id
  last_analyzed TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trends Table (Historical data)
CREATE TABLE IF NOT EXISTS public.trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coin TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  status TEXT CHECK (status IN ('bullish', 'bearish')) NOT NULL,
  since TIMESTAMPTZ NOT NULL, -- Opening time of the candle where the trend flipped
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification History Table
CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  trend_id UUID REFERENCES public.trends(id) NOT NULL,
  message TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints to monitored_pairs after trends is created
ALTER TABLE public.monitored_pairs
ADD CONSTRAINT fk_last_trend_daily FOREIGN KEY (last_trend_flip_daily_id) REFERENCES public.trends(id),
ADD CONSTRAINT fk_last_trend_weekly FOREIGN KEY (last_trend_flip_weekly_id) REFERENCES public.trends(id);

-- RLS Policies

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only read/update their own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only manage their own subscriptions" ON public.user_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- monitored_pairs
ALTER TABLE public.monitored_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Publicly readable" ON public.monitored_pairs
  FOR SELECT USING (true);
-- System-level updates (or admin) could be handled via service_role or specific policies. 
-- For now, let's assume workers use the service_role and don't need explicit policies.

-- trends
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Publicly readable" ON public.trends
  FOR SELECT USING (true);

-- notification_history
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only view their notifications" ON public.notification_history
  FOR SELECT USING (auth.uid() = user_id);

-- Functions and Triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at)
  VALUES (NEW.id, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
