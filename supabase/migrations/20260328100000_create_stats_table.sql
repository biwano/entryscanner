CREATE TABLE IF NOT EXISTS public.stats (
    day TIMESTAMPTZ PRIMARY KEY,
    pairs_total INTEGER NOT NULL DEFAULT 0,
    pairs_bearish_daily INTEGER NOT NULL DEFAULT 0,
    pairs_bearish_weekly INTEGER NOT NULL DEFAULT 0,
    pairs_bullish_daily INTEGER NOT NULL DEFAULT 0,
    pairs_bullish_weekly INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON public.stats
    FOR SELECT USING (true);

-- No public write access (service role only)
