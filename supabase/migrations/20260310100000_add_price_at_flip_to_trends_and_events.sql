-- Migration: Add price_at_flip to trends and events tables
-- Description: Captures the closing price of the candle where the trend flipped for percentage change calculation.
-- Created at: 2026-03-10

-- Add price_at_flip to trends table
ALTER TABLE public.trends
ADD COLUMN price_at_flip DECIMAL DEFAULT 0;

-- Add price_at_flip to events table
ALTER TABLE public.events
ADD COLUMN price_at_flip DECIMAL DEFAULT 0;

-- Update existing trends with a fallback price (optional but helpful for UI consistency)
-- This is a placeholder; real values will be populated on the next worker run.
COMMENT ON COLUMN public.trends.price_at_flip IS 'The closing price of the candle where the current trend flipped';
COMMENT ON COLUMN public.events.price_at_flip IS 'The closing price of the candle that triggered this trend flip';
