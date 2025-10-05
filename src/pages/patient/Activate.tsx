import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import logoAguera from '@/assets/logo-aguera.jpeg';
import { supabase } from '@/integrations/supabase/client';

export default function PatientActivate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [patientData, setPatientData] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      toast.error('Link de ativação inválido');
      navigate('/');
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_activation_tokens')
        .select('*, patients(*)')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        toast.error('Link de ativação inválido ou expirado');
        navigate('/');
        return;
      }

      setPatientData(data.patients);
    } catch (error) {
      console.error('Error validating token:', error);
      toast.error('Erro ao validar link de ativação');
      navigate('/');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: patientData.email,
        password: password,
        options: {
          data: {
            full_name: patientData.full_name
          }
        }
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // Link user to patient record
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          user_id: authData.user.id,
          activated_at: new Date().toISOString()
        })
        .eq('id', patientData.id);

      if (updateError) throw updateError;

      // Mark token as used
      const { error: tokenError } = await supabase
        .from('patient_activation_tokens')
        .update({ used: true })
        .eq('token', token);

      if (tokenError) console.error('Error marking token as used:', tokenError);

      toast.success('Conta ativada com sucesso!');
      
      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: patientData.email,
        password: password,
      });

      if (signInError) throw signInError;

      navigate('/paciente/dashboard');
    } catch (error: any) {
      console.error('Error activating account:', error);
      toast.error(error.message || 'Erro ao ativar conta');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validando link de ativação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <img 
              src={logoAguera} 
              alt="Aguera Dermatologia" 
              className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-primary/20 mb-4"
            />
            <CardTitle>Ative sua Conta</CardTitle>
            <CardDescription>
              Olá, {patientData?.full_name}! Defina sua senha para acessar a plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={patientData?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-10"
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
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Digite a senha novamente"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? 'Ativando...' : 'Ativar Conta'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}