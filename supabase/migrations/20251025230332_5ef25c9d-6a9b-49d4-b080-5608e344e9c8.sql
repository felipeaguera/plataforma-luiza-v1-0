-- Tornar o bucket 'news' público para permitir acesso às imagens
UPDATE storage.buckets 
SET public = true 
WHERE id = 'news';