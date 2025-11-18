import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, CalendarIcon, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
}

export function ExamDialog({ open, onOpenChange, patientId }: ExamDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examDate, setExamDate] = useState<Date>();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      toast.error('Por favor, preencha o título e selecione um arquivo');
      return;
    }

    // Check file size (3GB limit)
    const maxSize = 3 * 1024 * 1024 * 1024; // 3GB in bytes
    if (file.size > maxSize) {
      toast.error('O arquivo é muito grande. Tamanho máximo: 3GB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${patientId}/${fileName}`;

      setUploadProgress(30);
      const { error: uploadError } = await supabase.storage
        .from('exams')
        .upload(filePath, file);
      
      setUploadProgress(60);

      if (uploadError) throw uploadError;

      setUploadProgress(80);
      const { data: examData, error: insertError } = await supabase
        .from('exams')
        .insert({
          patient_id: patientId,
          title,
          description,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          exam_date: examDate ? format(examDate, 'yyyy-MM-dd') : null,
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setUploadProgress(100);

      // Send notification
      if (examData) {
        const { error: notificationError } = await supabase.functions.invoke(
          "send-notification",
          {
            body: {
              tipo: "exame",
              ref_id: examData.id,
              paciente_id: patientId,
            },
          }
        );

        if (notificationError) {
          console.error("Error sending notification:", notificationError);
        }
      }

      toast.success('Exame adicionado e paciente notificada!');
      queryClient.invalidateQueries({ queryKey: ['exams', patientId] });
      onOpenChange(false);
      setTitle('');
      setDescription('');
      setExamDate(undefined);
      setFile(null);
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Error uploading exam:', error);
      if (error?.statusCode === '413' || error?.message?.includes('exceeded')) {
        toast.error('Arquivo muito grande. Tamanho máximo: 3GB');
      } else {
        toast.error('Erro ao adicionar exame');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
    } else {
      toast.error('Por favor, selecione apenas arquivos PDF');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Exame</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Mapeamento de pintas - Janeiro 2025"
              required
            />
          </div>

          <div>
            <Label htmlFor="exam-date">Data de Realização</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-2",
                    !examDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {examDate ? format(examDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={examDate}
                  onSelect={setExamDate}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Observações sobre o exame..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="file">Arquivo PDF * (máx. 50MB)</Label>
            <div 
              className={cn(
                "mt-2 border-2 border-dashed rounded-lg p-6 transition-all",
                isDragging ? "border-primary bg-primary/5" : "border-border",
                file ? "bg-accent/50" : "bg-background"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                required
              />
              
              {file ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="text-primary" size={24} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    disabled={isUploading}
                  >
                    <X size={16} />
                  </Button>
                </div>
              ) : (
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Upload className="text-primary" size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Arraste seu arquivo PDF aqui
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ou clique para selecionar
                      </p>
                    </div>
                  </div>
                </label>
              )}
              
              {isUploading && (
                <div className="mt-4 space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-xs text-center text-muted-foreground">
                    Enviando... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Enviando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
