import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PatientProfile } from '@/components/patient/PatientProfile';
import { PatientExamsView } from '@/components/patient/PatientExamsView';
import { PatientRecommendationsView } from '@/components/patient/PatientRecommendationsView';
import { ClinicNews } from '@/components/patient/ClinicNews';

export default function PatientDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Perfil não encontrado</p>
          <Button onClick={handleSignOut}>Sair</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Minha Área</h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut size={16} className="mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <PatientProfile patient={patient} />
          <ClinicNews />
          <PatientExamsView patientId={patient.id} />
          <PatientRecommendationsView patientId={patient.id} />
        </div>
      </main>
    </div>
  );
}