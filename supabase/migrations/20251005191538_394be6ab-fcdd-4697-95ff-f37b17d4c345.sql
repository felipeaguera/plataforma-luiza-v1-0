-- Create patient-photos storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-photos', 'patient-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for patient-photos bucket
CREATE POLICY "Admins can upload patient photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update patient photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'patient-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete patient photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'patient-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Patient photos are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'patient-photos');