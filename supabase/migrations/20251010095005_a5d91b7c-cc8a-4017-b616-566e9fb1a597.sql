-- Add opt_in_novidades to patients table
ALTER TABLE public.patients 
ADD COLUMN opt_in_novidades boolean NOT NULL DEFAULT true;

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('exame', 'recomendacao', 'novidade')),
  destino text NOT NULL CHECK (destino IN ('paciente', 'todos')),
  ref_id uuid,
  paciente_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  meio text NOT NULL DEFAULT 'email' CHECK (meio IN ('email')),
  status text NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'falha')),
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all notifications"
ON public.notifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Patients can view their own notifications"
ON public.notifications
FOR SELECT
USING (
  paciente_id IN (
    SELECT id FROM public.patients WHERE user_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX idx_notifications_paciente_id ON public.notifications(paciente_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_tipo ON public.notifications(tipo);

-- Enable realtime for exams, recommendations, and clinic_news
ALTER PUBLICATION supabase_realtime ADD TABLE public.exams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recommendations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clinic_news;