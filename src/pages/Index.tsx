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
          alt="Aguera Dermatologia" 
          className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-primary/20 shadow-lg"
        />
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-foreground">
            Aguera Dermatologia
          </h1>
          <p className="text-xl text-muted-foreground">
            Sistema de gestão de pacientes e comunicação clínica
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/admin/login')}>
            Acesso Administrativo
            <ArrowRight className="ml-2" size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
