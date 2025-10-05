import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import logoAguera from '@/assets/logo-aguera.jpeg';

const ActivateAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [patientEmail, setPatientEmail] = useState('');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Link inválido",
        description: "O link de ativação está incompleto",
      });
      setIsValidating(false);
      return;
    }

    try {
      // Use any to bypass TypeScript issues with generated types
      const response: any = await supabase
        .from('patient_activation_tokens' as any)
        .select('*, patients!patient_id(email, full_name, user_id)')
        .eq('token', token)
        .maybeSingle();

      const { data, error } = response;

      if (error || !data) {
        toast({
          variant: "destructive",
          title: "Link inválido",
          description: "Este link de ativação não existe",
        });
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      if (data.used) {
        toast({
          variant: "destructive",
          title: "Link já utilizado",
          description: "Esta conta já foi ativada",
        });
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        toast({
          variant: "destructive",
          title: "Link expirado",
          description: "Este link de ativação expirou. Solicite um novo convite",
        });
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      const patient = data.patients;
      
      if (patient?.user_id) {
        toast({
          variant: "destructive",
          title: "Conta já ativada",
          description: "Esta conta já está ativa. Faça login no portal",
        });
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      setPatientEmail(patient?.email || '');
      setIsValid(true);
    } catch (error) {
      console.error('Error validating token:', error);
      toast({
        variant: "destructive",
        title: "Erro ao validar link",
        description: "Ocorreu um erro ao validar o link de ativação",
      });
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 caracteres",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas não conferem",
        description: "As senhas digitadas são diferentes",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('activate-patient-account', {
        body: {
          token,
          password,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Conta ativada com sucesso!",
        description: "Você já pode fazer login no portal",
      });

      setTimeout(() => {
        navigate('/paciente/login');
      }, 2000);
    } catch (error: any) {
      console.error('Error activating account:', error);
      toast({
        variant: "destructive",
        title: "Erro ao ativar conta",
        description: error.message || "Ocorreu um erro ao ativar sua conta",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Validando link de ativação...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img 
              src={logoAguera} 
              alt="Dra. Luiza Aguera" 
              className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-primary/20 shadow-lg mb-4"
            />
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>
              Este link de ativação não é válido ou já foi utilizado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/')}>
              Voltar para Página Inicial
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-foreground">Ative sua Conta</h1>
            <p className="text-muted-foreground mt-2">Dra. Luiza Aguera</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Crie sua Senha</CardTitle>
            <CardDescription>
              Crie uma senha segura para acessar o portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={patientEmail} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ativando conta...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Ativar Conta
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivateAccount;
