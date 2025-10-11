-- Update the exams bucket to allow files up to 50MB
UPDATE storage.buckets 
SET file_size_limit = 52428800
WHERE id = 'exams';