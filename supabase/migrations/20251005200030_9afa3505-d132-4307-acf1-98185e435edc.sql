-- Create table for patient activation tokens
CREATE TABLE IF NOT EXISTS public.patient_activation_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_activation_tokens ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_activation_token ON public.patient_activation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_activation_patient_id ON public.patient_activation_tokens(patient_id);

-- Create policy for public access (needed for activation page)
CREATE POLICY "Anyone can read tokens" 
ON public.patient_activation_tokens 
FOR SELECT 
USING (true);

-- Create policy for system to insert tokens
CREATE POLICY "Service role can insert tokens" 
ON public.patient_activation_tokens 
FOR INSERT 
WITH CHECK (true);

-- Create policy for system to update tokens
CREATE POLICY "Service role can update tokens" 
ON public.patient_activation_tokens 
FOR UPDATE 
USING (true);