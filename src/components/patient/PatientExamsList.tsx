import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, Calendar, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

interface PatientExamsListProps {
  patientId: string;
}

export function PatientExamsList({ patientId }: PatientExamsListProps) {
  const queryClient = useQueryClient();
  const [viewingExam, setViewingExam] = useState<{ url: string; title: string } | null>(null);

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

  const handleView = async (filePath: string, title: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('exams')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setViewingExam({ url, title });
    } catch (error) {
      console.error('Error viewing exam:', error);
      toast({
        variant: "destructive",
        title: "Erro ao visualizar exame",
        description: "Não foi possível visualizar o arquivo",
      });
    }
  };

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
    } catch (error) {
      console.error('Error downloading exam:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar exame",
        description: "Não foi possível fazer o download do arquivo",
      });
    }
  };

  const handleCloseViewer = () => {
    if (viewingExam?.url) {
      URL.revokeObjectURL(viewingExam.url);
    }
    setViewingExam(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Data não informada';
    return new Date(dateString).toLocaleDateString('pt-BR');
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
          <p className="text-muted-foreground text-center py-8">
            Nenhum exame disponível no momento
          </p>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="p-3 sm:p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm sm:text-base">{exam.title}</h4>
                    {exam.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">{exam.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-muted-foreground">
                      <Calendar size={14} />
                      <span>{formatDate(exam.exam_date)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(exam.file_path, exam.title)}
                      className="w-full sm:w-auto justify-center"
                    >
                      <Eye size={16} className="mr-2" />
                      Visualizar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(exam.file_path, exam.file_name)}
                      className="w-full sm:w-auto justify-center"
                    >
                      <Download size={16} className="mr-2" />
                      Baixar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!viewingExam} onOpenChange={handleCloseViewer}>
        <DialogContent className="w-[95vw] max-w-4xl h-[85vh] sm:h-[90vh] p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base truncate pr-8">{viewingExam?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-[calc(100%-3rem)]">
            {viewingExam && (
              <iframe
                src={viewingExam.url}
                className="w-full h-full rounded-lg border border-border"
                title={viewingExam.title}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
