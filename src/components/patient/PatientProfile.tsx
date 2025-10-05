import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatientProfileProps {
  patient: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    birth_date: string;
    photo_url: string | null;
    additional_info: string | null;
  };
}

export function PatientProfile({ patient }: PatientProfileProps) {
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${patient.id}-${Date.now()}.${fileExt}`;
      const filePath = `${patient.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('patient-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('patient-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('patients')
        .update({ photo_url: publicUrl })
        .eq('id', patient.id);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      toast.success('Foto atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['patient-profile'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar foto');
    },
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploading(true);
    try {
      await uploadPhotoMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meus Dados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-32 h-32">
              <AvatarImage src={patient.photo_url || ''} alt={patient.full_name} />
              <AvatarFallback className="text-2xl">
                {getInitials(patient.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="relative">
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
                disabled={isUploading}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('photo-upload')?.click()}
                disabled={isUploading}
              >
                <Camera size={16} className="mr-2" />
                {isUploading ? 'Enviando...' : 'Alterar Foto'}
              </Button>
            </div>
          </div>

          <div className="flex-1 grid gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
              <p className="text-lg">{patient.full_name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-lg">{patient.email}</p>
            </div>
            
            {patient.phone && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                <p className="text-lg">{patient.phone}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
              <p className="text-lg">
                {format(new Date(patient.birth_date), "dd/MM/yyyy", { locale: ptBR })}
                {' '}
                ({calculateAge(patient.birth_date)} anos)
              </p>
            </div>
            
            {patient.additional_info && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Informações Adicionais</label>
                <p className="text-lg whitespace-pre-wrap">{patient.additional_info}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}