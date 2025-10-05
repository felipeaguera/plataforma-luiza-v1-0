import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, Link2, FileText, Video } from 'lucide-react';

interface RecommendationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  recommendation?: any;
}

export function RecommendationDialog({ open, onOpenChange, patientId, recommendation }: RecommendationDialogProps) {
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<'text' | 'link' | 'file' | 'video'>('text');
  const [content, setContent] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (recommendation) {
      setTitle(recommendation.title);
      setContent(recommendation.content || '');
      if (recommendation.media_type === 'link' || recommendation.media_type === 'video') {
        setContentType('link');
        setLink(recommendation.media_url || '');
      } else if (recommendation.media_type === 'file') {
        setContentType('file');
      } else {
        setContentType('text');
      }
    } else {
      setTitle('');
      setContent('');
      setLink('');
      setFile(null);
      setContentType('text');
    }
  }, [recommendation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error('Por favor, preencha o título');
      return;
    }

    if (contentType === 'text' && !content) {
      toast.error('Por favor, preencha o conteúdo');
      return;
    }

    if (contentType === 'link' && !link) {
      toast.error('Por favor, insira o link');
      return;
    }

    if (contentType === 'file' && !file && !recommendation) {
      toast.error('Por favor, selecione um arquivo');
      return;
    }

    setIsSubmitting(true);
    try {
      let mediaUrl = recommendation?.media_url || null;
      let mediaType = contentType === 'text' ? null : contentType;

      // Upload file if new file is selected
      if (contentType === 'file' && file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${patientId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('recommendations')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('recommendations')
          .getPublicUrl(filePath);

        mediaUrl = publicUrl;
        mediaType = 'file';
      } else if (contentType === 'link') {
        mediaUrl = link;
        // Detect if it's a video link
        if (link.includes('youtube.com') || link.includes('youtu.be') || link.includes('vimeo.com')) {
          mediaType = 'video';
        } else {
          mediaType = 'link';
        }
      }

      const dataToSave = {
        title,
        content: contentType === 'text' ? content : null,
        media_type: mediaType,
        media_url: mediaUrl,
      };

      if (recommendation) {
        const { error } = await supabase
          .from('recommendations')
          .update(dataToSave)
          .eq('id', recommendation.id);

        if (error) throw error;
        toast.success('Recomendação atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('recommendations')
          .insert({
            ...dataToSave,
            patient_id: patientId,
            published_at: new Date().toISOString(),
          });

        if (error) throw error;
        toast.success('Recomendação adicionada com sucesso!');
      }

      queryClient.invalidateQueries({ queryKey: ['recommendations', patientId] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving recommendation:', error);
      toast.error('Erro ao salvar recomendação');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {recommendation ? 'Editar Recomendação' : 'Adicionar Recomendação'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Cuidados com exposição solar"
              required
            />
          </div>

          <div>
            <Label htmlFor="content-type">Tipo de Conteúdo *</Label>
            <Select value={contentType} onValueChange={(value: any) => setContentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <FileText size={16} />
                    Texto
                  </div>
                </SelectItem>
                <SelectItem value="link">
                  <div className="flex items-center gap-2">
                    <Link2 size={16} />
                    Link / Vídeo
                  </div>
                </SelectItem>
                <SelectItem value="file">
                  <div className="flex items-center gap-2">
                    <Upload size={16} />
                    Arquivo PDF
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {contentType === 'text' && (
            <div>
              <Label htmlFor="content">Conteúdo *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Descreva as recomendações específicas para esta paciente..."
                rows={6}
                required
              />
            </div>
          )}

          {contentType === 'link' && (
            <div>
              <Label htmlFor="link">Link / URL do Vídeo *</Label>
              <Input
                id="link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Links do YouTube, Vimeo ou qualquer URL
              </p>
            </div>
          )}

          {contentType === 'file' && (
            <div>
              <Label htmlFor="file">Arquivo PDF *</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload-recommendation"
                  required={!recommendation}
                />
                <label htmlFor="file-upload-recommendation">
                  <Button type="button" variant="outline" className="w-full" asChild>
                    <span className="cursor-pointer flex items-center justify-center">
                      <Upload className="mr-2" size={16} />
                      {file ? file.name : recommendation?.media_url ? 'Alterar arquivo PDF' : 'Selecionar arquivo PDF'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : recommendation ? 'Atualizar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
