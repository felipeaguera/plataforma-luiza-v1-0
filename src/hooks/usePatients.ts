import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PatientCreateData {
  full_name: string;
  email: string;
  phone?: string | null;
  birth_date: string;
  additional_info?: string | null;
}

export function usePatients() {
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { mutateAsync: createPatient, isPending: isCreating } = useMutation({
    mutationFn: async (patientData: PatientCreateData) => {
      const { data, error } = await supabase
        .from('patients')
        .insert([patientData])
        .select()
        .single();
      
      if (error) throw error;

      // Enviar email de convite automaticamente
      try {
        const { error: inviteError } = await supabase.functions.invoke('send-patient-invite', {
          body: { patientId: data.id }
        });
        
        if (inviteError) {
          console.error('Erro ao enviar convite:', inviteError);
          // Não falha a criação do paciente se o email falhar
        }
      } catch (emailError) {
        console.error('Erro ao enviar email de convite:', emailError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const { mutateAsync: updatePatient, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PatientCreateData> }) => {
      const { data: updated, error } = await supabase
        .from('patients')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const { mutateAsync: deletePatient, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  return {
    patients,
    isLoading,
    createPatient,
    isCreating,
    updatePatient,
    isUpdating,
    deletePatient,
    isDeleting,
  };
}
