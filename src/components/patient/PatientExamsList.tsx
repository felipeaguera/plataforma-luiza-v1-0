import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, Calendar, Eye, FileCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatientExamsListProps {
  patientId: string;
}

export function PatientExamsList({ patientId }: PatientExamsListProps) {
  const queryClient = useQueryClient();
  const [viewingExam, setViewingExam] = useState<{ 
    url: string; 
    title: string;
    filePath: string;
    fileName: string;
  } | null>(null);

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

  const handleView = async (filePath: string, fileName: string, title: string) => {
    try {
      console.log('Iniciando visualização do exame:', { filePath, fileName, title });
      
      toast({
        title: "Carregando exame...",
        description: "Preparando visualização",
      });

      const { data, error } = await supabase.storage
        .from('exams')
        .download(filePath);

      if (error) {
        console.error('Download error:', error);
        throw error;
      }

      console.log('Arquivo baixado com sucesso:', data.size, 'bytes');

      // Create a blob URL for the PDF
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      console.log('PDF URL criada:', url);
      
      // Open directly in new tab to avoid browser blocking issues
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        // If popup was blocked, fallback to modal
        setViewingExam({ url, title, filePath, fileName });
        toast({
          title: "PDF pronto!",
          description: "Visualize abaixo ou permita pop-ups para melhor experiência",
        });
      } else {
        toast({
          title: "PDF aberto em nova aba!",
          description: "Verifique a nova aba do navegador",
        });
        
        // Clean up the URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      console.error('Error viewing exam:', error);
      toast({
        variant: "destructive",
        title: "Erro ao visualizar exame",
        description: "Não foi possível visualizar o arquivo. Tente fazer o download.",
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
                        onClick={() => handleView(exam.file_path, exam.file_name, exam.title)}
                        className="w-full sm:w-auto"
                      >
                        <Eye size={16} className="mr-2" />
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(exam.file_path, exam.file_name)}
                        className="w-full sm:w-auto"
                      >
                        <Download size={16} className="mr-2" />
                        Baixar PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!viewingExam} onOpenChange={handleCloseViewer}>
        <DialogContent className="w-[95vw] max-w-6xl h-[90vh] p-2 sm:p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base sm:text-lg truncate pr-8">{viewingExam?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-[calc(100%-4rem)] bg-gray-100 rounded-lg">
            {viewingExam && (
              <>
                <iframe
                  src={`${viewingExam.url}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                  className="w-full h-full rounded-lg border-2 border-border"
                  title={viewingExam.title}
                  onLoad={() => {
                    console.log('Iframe carregado com sucesso');
                  }}
                  onError={(e) => {
                    console.error('Iframe error:', e);
                    toast({
                      variant: "destructive",
                      title: "Erro ao exibir PDF",
                      description: "Seu navegador pode não suportar visualização de PDFs. Use o botão 'Baixar PDF'.",
                    });
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-[iframe]:opacity-100">
                  <p className="text-sm text-muted-foreground">Carregando PDF...</p>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Button 
              onClick={() => {
                if (viewingExam) {
                  // Abre o PDF em nova aba como alternativa
                  window.open(viewingExam.url, '_blank');
                }
              }}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Eye size={16} className="mr-2" />
              Abrir em Nova Aba
            </Button>
            <Button 
              onClick={() => viewingExam && handleDownload(viewingExam.filePath, viewingExam.fileName)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Download size={16} className="mr-2" />
              Baixar PDF
            </Button>
            <Button 
              onClick={handleCloseViewer}
              variant="secondary"
              size="sm"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
