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
        .insert([{
          ...patientData,
          invite_sent_at: new Date().toISOString(),
        }])
        .select()
        .single();
      
      if (error) throw error;
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
