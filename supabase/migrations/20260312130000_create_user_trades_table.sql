-- Create user_trades table
CREATE TABLE IF NOT EXISTS public.user_trades (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    coin TEXT NOT NULL,
    take_profit_price NUMERIC,
    take_profit_pct NUMERIC DEFAULT 50 NOT NULL,
    stop_loss_pct NUMERIC DEFAULT 10 NOT NULL,
    status TEXT NOT NULL DEFAULT 'sleeping' CHECK (status IN ('requested', 'entry_set_up', 'exit_setup', 'sleeping')),
    direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_trades ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can only read their own trades"
ON public.user_trades
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can only insert their own trades"
ON public.user_trades
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can only update their own trades"
ON public.user_trades
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can only delete their own trades"
ON public.user_trades
FOR DELETE
USING (auth.uid() = id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_trades_updated_at
BEFORE UPDATE ON public.user_trades
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
