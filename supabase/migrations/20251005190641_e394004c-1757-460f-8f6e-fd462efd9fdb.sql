-- Add photo_url column to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS photo_url TEXT;