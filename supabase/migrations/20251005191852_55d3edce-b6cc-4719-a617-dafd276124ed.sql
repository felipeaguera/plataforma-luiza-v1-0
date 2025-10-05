-- Add exam_date column to exams table
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS exam_date DATE;