import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import logoAguera from '@/assets/logo-aguera.jpeg';

const PatientLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao fazer login",
          description: error.message === "Invalid login credentials" 
            ? "Email ou senha incorretos" 
            : error.message,
        });
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo(a) ao portal do paciente",
        });
        navigate('/paciente/portal');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: "Ocorreu um erro inesperado. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <img 
            src={logoAguera} 
            alt="Dra. Luiza Aguera" 
            className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-primary/20 shadow-lg"
          />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Portal do Paciente</h1>
            <p className="text-muted-foreground mt-2">Dra. Luiza Aguera</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acesso do Paciente</CardTitle>
            <CardDescription>
              Entre com seu email e senha cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2" size={16} />
            Voltar para página inicial
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PatientLogin;
