-- Migration: Add active column to monitored_pairs
-- Date: 2026-02-28

ALTER TABLE public.monitored_pairs 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE NOT NULL;
