-- Drop existing functions
DROP FUNCTION IF EXISTS public.generate_share_token();
DROP FUNCTION IF EXISTS public.create_exam_share(uuid);

-- Create new token generation function using gen_random_uuid (always available)
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate token from random UUID
    token := encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64');
    token := replace(replace(replace(token, '+', ''), '/', ''), '=', '');
    token := substring(token, 1, 32);
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM public.document_shares WHERE document_shares.token = token) INTO token_exists;
    
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN token;
END;
$$;

-- Recreate create_exam_share function
CREATE OR REPLACE FUNCTION public.create_exam_share(exam_id uuid)
RETURNS TABLE(share_id uuid, share_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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