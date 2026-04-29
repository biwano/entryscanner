-- Create user sub-accounts and remove profile-level HL credentials
CREATE TABLE IF NOT EXISTS public.user_sub_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  hl_api_key TEXT NOT NULL,
  hl_wallet_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_sub_accounts_user_label_unique UNIQUE (user_id, label)
);

ALTER TABLE public.user_sub_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own sub accounts" ON public.user_sub_accounts;
CREATE POLICY "Users can read own sub accounts"
  ON public.user_sub_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sub accounts" ON public.user_sub_accounts;
CREATE POLICY "Users can insert own sub accounts"
  ON public.user_sub_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sub accounts" ON public.user_sub_accounts;
CREATE POLICY "Users can update own sub accounts"
  ON public.user_sub_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sub accounts" ON public.user_sub_accounts;
CREATE POLICY "Users can delete own sub accounts"
  ON public.user_sub_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_user_sub_accounts_updated_at ON public.user_sub_accounts;
CREATE TRIGGER set_user_sub_accounts_updated_at
  BEFORE UPDATE ON public.user_sub_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.profiles DROP COLUMN IF EXISTS hl_api_key;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS hl_wallet_address;
