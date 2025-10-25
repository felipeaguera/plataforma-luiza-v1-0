import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import logoAguera from '@/assets/logo-aguera.jpeg';
import { PatientProfile } from '@/components/patient/PatientProfile';
import { PatientExamsList } from '@/components/patient/PatientExamsList';
import { PatientRecommendationsList } from '@/components/patient/PatientRecommendationsList';
import { ClinicNewsTimeline } from '@/components/patient/ClinicNewsTimeline';

const PatientPortal = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: patient, isLoading, refetch } = useQuery({
    queryKey: ['patient-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/paciente/login');
  };

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
          <p className="text-muted-foreground">Perfil de paciente não encontrado</p>
          <Button onClick={handleSignOut}>Sair</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <img 
              src={logoAguera} 
              alt="Dra. Luiza Aguera" 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-primary/20 flex-shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-foreground truncate">Portal do Paciente</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Dra. Luiza Aguera</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="flex-shrink-0">
            <LogOut className="sm:mr-2" size={16} />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8">
        <div className="mb-4 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Bem-vindo(a), {patient.full_name}!
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Acesse seus exames, recomendações e novidades da clínica
          </p>
        </div>

        <PatientProfile patient={patient} onPhotoUpdate={refetch} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <PatientExamsList patientId={patient.id} />
          <PatientRecommendationsList patientId={patient.id} />
        </div>

        <ClinicNewsTimeline />
      </main>
    </div>
  );
};

export default PatientPortal;
