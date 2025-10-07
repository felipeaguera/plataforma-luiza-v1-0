
-- Remove políticas existentes se houver
DROP POLICY IF EXISTS "Patients can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Patients can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload patient photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update patient photos" ON storage.objects;

-- Recria políticas corrigidas

-- Admins podem fazer upload
CREATE POLICY "Admins can upload patient photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Admins podem atualizar
CREATE POLICY "Admins can update patient photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'patient-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Pacientes podem fazer upload nas suas próprias pastas
CREATE POLICY "Patients can upload their own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-photos'
  AND EXISTS (
    SELECT 1 FROM patients 
    WHERE user_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);

-- Pacientes podem atualizar suas próprias fotos
CREATE POLICY "Patients can update their own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'patient-photos'
  AND EXISTS (
    SELECT 1 FROM patients 
    WHERE user_id = auth.uid() 
    AND id::text = (storage.foldername(name))[1]
  )
);
