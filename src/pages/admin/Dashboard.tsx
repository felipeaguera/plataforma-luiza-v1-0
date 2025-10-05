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
          <Button variant="outline" onClick={signOut}>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="text-primary" size={20} />
                Pacientes
              </CardTitle>
              <CardDescription>Total cadastradas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="text-primary" size={20} />
                Exames
              </CardTitle>
              <CardDescription>Publicados este mês</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="text-primary" size={20} />
                Convites
              </CardTitle>
              <CardDescription>Pendentes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">0</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Ações Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button size="lg" className="justify-start">
              <Users className="mr-2" size={18} />
              Cadastrar Nova Paciente
            </Button>
            <Button size="lg" variant="outline" className="justify-start">
              <FileText className="mr-2" size={18} />
              Ver Todas as Pacientes
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
