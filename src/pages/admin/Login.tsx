import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import logoAguera from '@/assets/logo-aguera.jpeg';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { signIn, user, isAdmin, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in as admin
  useEffect(() => {
    if (user && !authLoading) {
      if (isAdmin) {
        setIsLoading(false);
        navigate('/admin/dashboard', { replace: true });
      } else {
        // Not an admin, show error and reset
        setIsLoading(false);
        toast.error('Acesso negado. Você não tem permissão de administrador.');
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error('Credenciais inválidas. Verifique email e senha.');
      setIsLoading(false);
      return;
    }

    // Don't navigate here - let the useEffect handle it after isAdmin is set
    toast.success('Login realizado com sucesso!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Voltar
        </Button>
        
        <div className="bg-card border border-border rounded-2xl shadow-lg p-8 space-y-6">
          {/* Logo */}
          <div className="text-center space-y-2">
            <img 
              src={logoAguera} 
              alt="Aguera Dermatologia" 
              className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-primary/20"
            />
            <h1 className="text-2xl font-bold text-foreground">Aguera Dermatologia</h1>
            <p className="text-sm text-muted-foreground">Painel Administrativo</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@aguera.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
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

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Acesso restrito a administradores da clínica
          </p>
        </div>
      </div>
    </div>
  );
}
