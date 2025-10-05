import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PatientsList } from '@/components/admin/PatientsList';
import { PatientDialog } from '@/components/admin/PatientDialog';
import { useState } from 'react';

export default function PatientsPage() {
  const navigate = useNavigate();
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="mr-2" size={18} />
              Voltar ao Dashboard
            </Button>
          </div>
          <Button onClick={() => setIsPatientDialogOpen(true)}>
            Cadastrar Nova Paciente
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Pacientes</h1>
          <p className="text-muted-foreground">Gerencie todas as pacientes cadastradas no sistema</p>
        </div>

        <PatientsList />

        <PatientDialog 
          open={isPatientDialogOpen} 
          onOpenChange={setIsPatientDialogOpen}
        />
      </div>
    </div>
  );
}
