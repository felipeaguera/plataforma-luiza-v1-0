-- Make recommendations bucket public so videos can be viewed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'recommendations';