-- Add hl_api_key column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hl_api_key TEXT;
