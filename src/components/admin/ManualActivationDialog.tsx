import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Key } from 'lucide-react';

interface ManualActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    id: string;
    email: string;
    full_name: string;
  };
  onSuccess: () => void;
}

export function ManualActivationDialog({ open, onOpenChange, patient, onSuccess }: ManualActivationDialogProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 caracteres",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create auth user with admin privileges
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: patient.email,
        password: password,
        email_confirm: true,
      });

      if (authError) throw authError;

      // Update patient record with user_id and activated_at
      const { error: updateError } = await supabase
        .from('patients')
        .update({ 
          user_id: authData.user.id,
          activated_at: new Date().toISOString(),
        })
        .eq('id', patient.id);

      if (updateError) throw updateError;

      toast({
        title: "Paciente ativado com sucesso!",
        description: `Email: ${patient.email}\nSenha: ${password}`,
      });

      setPassword('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error activating patient:', error);
      toast({
        variant: "destructive",
        title: "Erro ao ativar paciente",
        description: error.message || "Ocorreu um erro ao ativar o paciente",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newPassword = '';
    for (let i = 0; i < 8; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ativação Manual (Teste)</DialogTitle>
          <DialogDescription>
            Crie uma conta de teste para {patient.full_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleActivate} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={patient.email} disabled />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha Temporária</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                placeholder="Digite ou gere uma senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={generatePassword}
                disabled={isLoading}
              >
                <Key size={16} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo 6 caracteres. Anote esta senha para informar ao paciente!
            </p>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-sm text-yellow-600 dark:text-yellow-500">
              ⚠️ Esta é uma função de teste. Em produção, use o envio de email.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ativando...
                </>
              ) : (
                'Ativar Paciente'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
