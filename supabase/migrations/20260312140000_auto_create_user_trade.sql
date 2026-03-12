-- Make coin and direction nullable to allow for default "sleeping" state
ALTER TABLE public.user_trades ALTER COLUMN coin DROP NOT NULL;
ALTER TABLE public.user_trades ALTER COLUMN direction DROP NOT NULL;

-- Update the handle_new_user function to include user_trades initialization
-- This function is originally defined in 20260228170000_initial_schema.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, created_at)
  VALUES (NEW.id, NOW());

  -- Create default trade configuration in "sleeping" state
  -- id references auth.users(id)
  INSERT INTO public.user_trades (id, status, created_at, updated_at)
  VALUES (NEW.id, 'sleeping', NOW(), NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing users who don't have a user_trades entry
-- We check profiles table for existing users that were handled by the old trigger
INSERT INTO public.user_trades (id, status)
SELECT id, 'sleeping'
FROM public.profiles
WHERE id NOT IN (SELECT id FROM public.user_trades)
ON CONFLICT (id) DO NOTHING;
