import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PatientDialog } from '@/components/admin/PatientDialog';

interface PatientGeneralInfoProps {
  patient: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    birth_date: string;
    photo_url?: string | null;
    additional_info?: string | null;
    created_at: string;
  };
}

export function PatientGeneralInfo({ patient }: PatientGeneralInfoProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${patient.id}-${Date.now()}.${fileExt}`;
      const filePath = `${patient.id}/${fileName}`;

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

      const { data: { publicUrl } } = supabase.storage
        .from('patient-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('patients')
        .update({ photo_url: publicUrl })
        .eq('id', patient.id);

      if (updateError) throw updateError;

      toast.success('Foto atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      const errorMessage = error?.message || 'Erro ao fazer upload da foto';
      toast.error(errorMessage);
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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dados Gerais</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="mr-2" size={16} />
            Editar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-32 h-32">
                <AvatarImage src={patient.photo_url || undefined} alt={patient.full_name} />
                <AvatarFallback className="text-2xl">
                  {getInitials(patient.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                  disabled={isUploading}
                />
                <label htmlFor="photo-upload">
                  <Button variant="outline" size="sm" asChild disabled={isUploading}>
                    <span className="cursor-pointer">
                      <Camera className="mr-2" size={16} />
                      {isUploading ? 'Enviando...' : 'Alterar Foto'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                <p className="text-foreground mt-1">{patient.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-foreground mt-1">{patient.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                <p className="text-foreground mt-1">{patient.phone || 'Não informado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                <p className="text-foreground mt-1">
                  {format(new Date(patient.birth_date + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cadastrado em</label>
                <p className="text-foreground mt-1">
                  {format(new Date(patient.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              {patient.additional_info && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Informações Adicionais</label>
                  <p className="text-foreground mt-1 whitespace-pre-wrap">{patient.additional_info}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <PatientDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        patient={patient}
      />
    </>
  );
}
