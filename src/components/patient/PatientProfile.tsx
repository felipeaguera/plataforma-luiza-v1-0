import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PatientProfileProps {
  patient: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    birth_date: string;
    photo_url?: string;
    additional_info?: string;
  };
  onPhotoUpdate: () => void;
}

export function PatientProfile({ patient, onPhotoUpdate }: PatientProfileProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${patient.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('patient-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('patient-photos')
        .getPublicUrl(filePath);

      // Update patient record
      const { error: updateError } = await supabase
        .from('patients')
        .update({ photo_url: publicUrl })
        .eq('id', patient.id);

      if (updateError) throw updateError;

      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso",
      });

      onPhotoUpdate();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      const errorMessage = error?.message || 'Ocorreu um erro ao fazer upload da foto';
      toast({
        variant: "destructive",
        title: "Erro ao atualizar foto",
        description: errorMessage,
      });
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Meu Perfil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          <div className="relative flex-shrink-0">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
              <AvatarImage src={patient.photo_url} alt={patient.full_name} />
              <AvatarFallback className="text-xl sm:text-2xl">{getInitials(patient.full_name)}</AvatarFallback>
            </Avatar>
            <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 sm:p-2 cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera size={14} className="sm:w-4 sm:h-4" />
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={isUploading}
              />
            </label>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">{patient.full_name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Data de Nascimento: {formatDate(patient.birth_date)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-sm sm:text-base text-foreground break-all">{patient.email}</p>
          </div>
          {patient.phone && (
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Telefone</p>
              <p className="text-sm sm:text-base text-foreground">{patient.phone}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
