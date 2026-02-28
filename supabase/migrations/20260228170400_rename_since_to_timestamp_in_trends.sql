-- Rename column 'since' to 'timestamp' in the 'trends' table
ALTER TABLE public.trends RENAME COLUMN since TO timestamp;
