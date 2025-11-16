import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Download, Eye, Trash2, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExamDialog } from './ExamDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ExamShareBlock } from './ExamShareBlock';

interface PatientExamsProps {
  patientId: string;
  patientName: string;
}

export function PatientExams({ patientId, patientName }: PatientExamsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['exams', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { mutateAsync: deleteExam } = useMutation({
    mutationFn: async (examId: string) => {
      const exam = exams.find(e => e.id === examId);
      if (exam?.file_path) {
        await supabase.storage.from('exams').remove([exam.file_path]);
      }
      
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Exame excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['exams', patientId] });
      setExamToDelete(null);
    },
    onError: () => {
      toast.error('Erro ao excluir exame');
    },
  });

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
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Download iniciado!');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erro ao fazer download');
    }
  };

  const handleView = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('exams')
        .download(filePath);
      
      if (error) throw error;

      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Erro ao visualizar arquivo');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exames</CardTitle>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2" size={16} />
            Adicionar Exame
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando exames...</p>
          ) : exams.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-muted rounded-full mb-4">
                <FileText className="text-muted-foreground" size={32} />
              </div>
              <p className="text-muted-foreground">Nenhum exame cadastrado</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {exams.map((exam) => (
                <div 
                  key={exam.id} 
                  className="group relative overflow-hidden border rounded-xl p-5 hover:shadow-md transition-all bg-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl shadow-sm">
                        <FileText className="text-primary" size={28} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-lg mb-2">{exam.title}</h4>
                        
                        <div className="flex flex-wrap gap-2 mb-2">
                          {exam.exam_date && (
                            <Badge variant="secondary" className="text-xs">
                              <Calendar size={12} className="mr-1" />
                              {format(new Date(exam.exam_date), "dd/MM/yyyy", { locale: ptBR })}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            <Clock size={12} className="mr-1" />
                            {format(new Date(exam.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </Badge>
                          {exam.file_size && (
                            <Badge variant="outline" className="text-xs">
                              {(exam.file_size / 1024 / 1024).toFixed(2)} MB
                            </Badge>
                          )}
                        </div>
                        
                        {exam.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{exam.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(exam.file_path)}
                        title="Visualizar"
                      >
                        <Eye size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(exam.file_path, exam.file_name)}
                        title="Baixar"
                      >
                        <Download size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExamToDelete(exam.id)}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                  
                  {/* QR Code Share Block */}
                  <div className="mt-4 pt-4 border-t">
                    <ExamShareBlock 
                      examId={exam.id}
                      examTitle={exam.title}
                      examDate={exam.exam_date}
                      patientName={patientName}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ExamDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        patientId={patientId}
      />

      <AlertDialog open={!!examToDelete} onOpenChange={() => setExamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este exame? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => examToDelete && deleteExam(examToDelete)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
