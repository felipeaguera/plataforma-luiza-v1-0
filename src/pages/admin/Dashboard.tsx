import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Bell, LogOut } from 'lucide-react';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Aguera Dermatologia</h1>
            <p className="text-sm text-muted-foreground">Painel Administrativo</p>
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
            Bem-vinda, {user?.user_metadata?.full_name || 'Admin'}!
          </h2>
          <p className="text-muted-foreground">
            Gerencie pacientes, exames e comunicações da clínica
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
              <p className="text-4xl font-bold">0</p>
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
              <p className="text-4xl font-bold">0</p>
            </CardContent>
          </Card>
        </div>

        {/* Patient Management Section */}
        <div className="space-y-4 mb-8">
          <h3 className="text-xl font-semibold text-foreground">Gestão de Pacientes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button size="lg" className="justify-start">
              <Users className="mr-2" size={18} />
              Cadastrar Nova Paciente
            </Button>
            <Button size="lg" variant="outline" className="justify-start">
              <Users className="mr-2" size={18} />
              Buscar Paciente
            </Button>
          </div>
        </div>

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
