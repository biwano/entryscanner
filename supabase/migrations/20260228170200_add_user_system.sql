-- Migration: Add user_system table and cleanup profiles
-- Date: 2026-02-28

-- 1. Cleanup profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS wallet_address;

-- 2. Create user_system table
CREATE TABLE IF NOT EXISTS public.user_system (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on user_system
ALTER TABLE public.user_system ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for user_system
-- Users can read their own system status (and others, as per spec "Publicly readable")
CREATE POLICY "Publicly readable" ON public.user_system
    FOR SELECT USING (true);

-- Only admins can update user_system (using is_admin check)
CREATE POLICY "Only admins can update user_system" ON public.user_system
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_system 
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

-- 5. Update monitored_pairs RLS to allow admins to manage pairs
CREATE POLICY "Admins can manage monitored_pairs" ON public.monitored_pairs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_system 
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_system 
            WHERE user_id = auth.uid() AND is_admin = TRUE
        )
    );

-- 6. Ensure every existing user has a record in user_system (optional, but good for consistency)
INSERT INTO public.user_system (user_id, is_admin)
SELECT id, FALSE FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 7. Update handle_new_user function to also create user_system record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at)
  VALUES (NEW.id, NOW());
  
  INSERT INTO public.user_system (user_id, is_admin)
  VALUES (NEW.id, FALSE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
