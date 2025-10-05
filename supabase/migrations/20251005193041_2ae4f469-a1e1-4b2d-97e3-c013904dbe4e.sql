-- Make content column nullable in recommendations table
ALTER TABLE public.recommendations ALTER COLUMN content DROP NOT NULL;