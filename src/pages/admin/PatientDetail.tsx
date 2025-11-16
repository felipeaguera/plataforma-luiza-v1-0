import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PatientGeneralInfo } from '@/components/admin/patient-detail/PatientGeneralInfo';
import { PatientExams } from '@/components/admin/patient-detail/PatientExams';
import { PatientRecommendations } from '@/components/admin/patient-detail/PatientRecommendations';

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Paciente não encontrada</p>
          <Button onClick={() => navigate('/admin/pacientes')}>
            Voltar para Lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/pacientes')}>
            <ArrowLeft className="mr-2" size={18} />
            Voltar para Lista
          </Button>
        </div>

        <div className="space-y-8">
          {/* General Info Section */}
          <PatientGeneralInfo patient={patient} />

          {/* Exams Section */}
          <PatientExams patientId={patient.id} patientName={patient.full_name} />

          {/* Recommendations Section */}
          <PatientRecommendations patientId={patient.id} />
        </div>
      </div>
    </div>
  );
}
