import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Bell, LogOut } from 'lucide-react';
import { PatientDialog } from '@/components/admin/PatientDialog';
import { PatientsList } from '@/components/admin/PatientsList';
import { usePatients } from '@/hooks/usePatients';
import logo from '@/assets/logo-aguera.jpeg';

const motivationalPhrases = [
  "Sua dedicação transforma vidas! Continue brilhando! ✨",
  "Mulher poderosa, sua energia inspira a todos! 💪",
  "Você é incrível e faz a diferença todos os dias! 🌟",
  "Sua beleza interior reflete no cuidado com cada paciente! 💖",
  "Que orgulho de tê-la aqui, mulher extraordinária! 👑",
  "Sua força e determinação são admiráveis! 🌺",
  "Você ilumina este espaço com sua presença! ☀️",
  "Mulher inspiradora, seu trabalho é arte! 🎨",
  "Continue sendo essa profissional excepcional! 🦋",
  "Sua paixão pelo que faz é contagiante! 💫"
];

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const { patients } = usePatients();
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const [showPatientsList, setShowPatientsList] = useState(false);
  
  const motivationalPhrase = useMemo(() => {
    return motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];
  }, []);

  const pendingInvites = patients.filter(p => !p.activated_at).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Aguera Dermatologia" className="h-12 w-12 rounded-lg object-cover" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Aguera Dermatologia</h1>
              <p className="text-sm text-muted-foreground">Painel Administrativo</p>
            </div>
          </div>
          <Button variant="destructive" onClick={signOut}>
            <LogOut className="mr-2" size={16} />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Bem-vinda, Dr Luiza Aguera!
          </h2>
          <p className="text-primary font-medium text-lg">
            {motivationalPhrase}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="text-primary" size={20} />
                Pacientes Cadastradas
              </CardTitle>
              <CardDescription>Total no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{patients.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="text-primary" size={20} />
                Convites Pendentes
              </CardTitle>
              <CardDescription>Aguardando ativação</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{pendingInvites}</p>
            </CardContent>
          </Card>
        </div>

        {/* Patient Management Section */}
        <div className="space-y-4 mb-8">
          <h3 className="text-xl font-semibold text-foreground">Gestão de Pacientes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button size="lg" className="justify-start" onClick={() => setIsPatientDialogOpen(true)}>
              <Users className="mr-2" size={18} />
              Cadastrar Nova Paciente
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="justify-start"
              onClick={() => setShowPatientsList(!showPatientsList)}
            >
              <Users className="mr-2" size={18} />
              {showPatientsList ? 'Ocultar Pacientes' : 'Ver Todas as Pacientes'}
            </Button>
          </div>
        </div>

        {/* Patients List */}
        {showPatientsList && (
          <div className="mb-8">
            <PatientsList />
          </div>
        )}

        {/* Patient Dialog */}
        <PatientDialog 
          open={isPatientDialogOpen} 
          onOpenChange={setIsPatientDialogOpen}
        />

        {/* Clinic News Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-foreground">Novidades da Clínica</h3>
            <Button variant="outline">
              <Bell className="mr-2" size={18} />
              Criar Novidade
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">
                Nenhuma novidade publicada ainda. As novidades aparecerão na timeline de todas as pacientes.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
