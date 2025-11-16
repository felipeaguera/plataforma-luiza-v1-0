-- Create document_shares table for secure exam sharing
CREATE TABLE public.document_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  revogado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  view_count INTEGER NOT NULL DEFAULT 0,
  last_view_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster token lookups
CREATE INDEX idx_document_shares_token ON public.document_shares(token);
CREATE INDEX idx_document_shares_documento_id ON public.document_shares(documento_id);

-- Enable RLS
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- Admins can manage all shares
CREATE POLICY "Admins can manage all shares"
ON public.document_shares
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can read active (non-revoked, non-expired) shares for validation
CREATE POLICY "Anyone can read active shares"
ON public.document_shares
FOR SELECT
USING (
  revogado_em IS NULL 
  AND (expires_at IS NULL OR expires_at > now())
);

-- Function to generate secure random token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 32 character random token
    token := encode(gen_random_bytes(24), 'base64');
    token := replace(replace(replace(token, '+', ''), '/', ''), '=', '');
    token := substring(token, 1, 32);
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM public.document_shares WHERE document_shares.token = token) INTO token_exists;
    
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN token;
END;
$$;

-- Function to create or regenerate share link for an exam
CREATE OR REPLACE FUNCTION public.create_exam_share(exam_id UUID)
RETURNS TABLE(share_id UUID, share_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  new_share_id UUID;
BEGIN
  -- Revoke any existing active shares for this exam
  UPDATE public.document_shares
  SET revogado_em = now()
  WHERE documento_id = exam_id 
    AND revogado_em IS NULL;
  
  -- Generate new token
  new_token := public.generate_share_token();
  
  -- Create new share
  INSERT INTO public.document_shares (documento_id, token)
  VALUES (exam_id, new_token)
  RETURNING id, token INTO new_share_id, new_token;
  
  RETURN QUERY SELECT new_share_id, new_token;
END;
$$;

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_share_view(share_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.document_shares
  SET 
    view_count = view_count + 1,
    last_view_at = now()
  WHERE token = share_token;
END;
$$;