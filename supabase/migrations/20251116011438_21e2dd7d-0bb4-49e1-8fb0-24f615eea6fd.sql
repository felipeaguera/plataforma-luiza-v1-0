-- Create RLS policy to allow public access to exams via active shares
CREATE POLICY "Public can view exams via active shares"
ON public.exams
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.document_shares ds
    WHERE ds.documento_id = exams.id
      AND ds.revogado_em IS NULL
      AND (ds.expires_at IS NULL OR ds.expires_at > now())
  )
);