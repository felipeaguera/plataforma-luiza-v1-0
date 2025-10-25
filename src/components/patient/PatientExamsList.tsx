import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar, FileCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatientExamsListProps {
  patientId: string;
}

export function PatientExamsList({ patientId }: PatientExamsListProps) {
  const queryClient = useQueryClient();

  const { data: exams, isLoading } = useQuery({
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

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('exams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exams',
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['patient-exams', patientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, queryClient]);

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('exams')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download iniciado!",
        description: "O arquivo está sendo baixado",
      });
    } catch (error) {
      console.error('Error downloading exam:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar exame",
        description: "Não foi possível fazer o download do arquivo",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="text-primary" size={20} />
            Meus Exames
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando exames...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="text-primary" size={20} />
          Meus Exames
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!exams || exams.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full mb-4">
              <FileCheck className="text-primary" size={32} />
            </div>
            <p className="text-muted-foreground">Nenhum exame disponível no momento</p>
            <p className="text-xs text-muted-foreground mt-2">Você será notificada quando novos exames forem adicionados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="group relative overflow-hidden border-2 rounded-xl p-4 hover:shadow-lg hover:border-primary/20 transition-all bg-gradient-to-br from-card to-card/50"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl shadow-sm shrink-0">
                    <FileText className="text-primary" size={24} />
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <h4 className="font-semibold text-foreground text-base mb-2">{exam.title}</h4>
                      {exam.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{exam.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {exam.exam_date && (
                          <Badge variant="secondary" className="text-xs">
                            <Calendar size={12} className="mr-1" />
                            {format(new Date(exam.exam_date), "dd 'de' MMM, yyyy", { locale: ptBR })}
                          </Badge>
                        )}
                        {exam.file_size && (
                          <Badge variant="outline" className="text-xs">
                            {(exam.file_size / 1024 / 1024).toFixed(2)} MB
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleDownload(exam.file_path, exam.file_name)}
                        className="w-full"
                      >
                        <Download size={16} className="mr-2" />
                        Baixar Exame
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
