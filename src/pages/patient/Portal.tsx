import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import logoAguera from '@/assets/logo-aguera.jpeg';

const PatientPortal = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/paciente/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={logoAguera} 
              alt="Dra. Luiza Aguera" 
              className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">Portal do Paciente</h1>
              <p className="text-sm text-muted-foreground">Dra. Luiza Aguera</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="mr-2" size={16} />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Bem-vindo(a), {user?.email}
          </h2>
          <p className="text-muted-foreground">
            Acesse seus exames, recomendações e novidades da clínica
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Meus Exames</CardTitle>
              <CardDescription>
                Visualize seus exames e resultados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Em breve você poderá acessar seus exames aqui
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recomendações</CardTitle>
              <CardDescription>
                Vídeos e orientações personalizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Em breve você poderá acessar suas recomendações aqui
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Novidades</CardTitle>
              <CardDescription>
                Últimas notícias da clínica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Em breve você poderá acessar as novidades aqui
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PatientPortal;
