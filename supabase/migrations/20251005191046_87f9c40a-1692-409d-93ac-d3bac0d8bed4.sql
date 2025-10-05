-- Add additional_info column to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS additional_info TEXT;