-- Drop and recreate the token generation function with proper column references
DROP FUNCTION IF EXISTS public.generate_share_token();

CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_token TEXT;
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate token from random UUID
    new_token := encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64');
    new_token := replace(replace(replace(new_token, '+', ''), '/', ''), '=', '');
    new_token := substring(new_token, 1, 32);
    
    -- Check if token already exists (qualified column reference)
    SELECT EXISTS(
      SELECT 1 FROM public.document_shares ds WHERE ds.token = new_token
    ) INTO token_exists;
    
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  RETURN new_token;
END;
$$;