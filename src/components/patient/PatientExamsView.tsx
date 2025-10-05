import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatientExamsViewProps {
  patientId: string;
}

export function PatientExamsView({ patientId }: PatientExamsViewProps) {
  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['patient-exams', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('patient_id', patientId)
        .not('published_at', 'is', null)
        .order('exam_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('exams')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meus Exames</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando exames...</p>
        ) : exams.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum exame disponível</p>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <div key={exam.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText size={20} className="text-primary" />
                    <div>
                      <h4 className="font-medium">{exam.title}</h4>
                      {exam.description && (
                        <p className="text-sm text-muted-foreground">{exam.description}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={getFileUrl(exam.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      <Download size={16} />
                      Baixar
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Data do exame: {exam.exam_date ? format(new Date(exam.exam_date), "dd/MM/yyyy", { locale: ptBR }) : 'Não informada'}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}