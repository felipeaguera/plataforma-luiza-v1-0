import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import logoAguera from '@/assets/logo-aguera.jpeg';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="text-center space-y-8 p-8 max-w-2xl">
        <img 
          src={logoAguera} 
          alt="Dra. Luiza Aguera" 
          className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-primary/20 shadow-lg"
        />
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-foreground">
            Dra. Luiza Aguera
          </h1>
          <p className="text-xl text-muted-foreground">
            Plataforma de atendimento e acompanhamento dermatológico
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/admin/login')} variant="default">
            <ArrowRight className="mr-2" size={18} />
            Acesso Administrativo
          </Button>
          <Button size="lg" onClick={() => navigate('/paciente/login')} variant="outline">
            <ArrowRight className="mr-2" size={18} />
            Acesso Paciente
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Escolha o tipo de acesso apropriado
        </p>
      </div>
    </div>
  );
};

export default Index;
