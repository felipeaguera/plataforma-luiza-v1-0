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
import { Upload, Link2, FileText, Video, Camera } from 'lucide-react';
import { VideoRecorder } from '@/components/admin/VideoRecorder';

interface RecommendationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  recommendation?: any;
}

export function RecommendationDialog({ open, onOpenChange, patientId, recommendation }: RecommendationDialogProps) {
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<'text' | 'link' | 'file' | 'video' | 'record'>('text');
  const [content, setContent] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (recommendation) {
      setTitle(recommendation.title);
      setContent(recommendation.content || '');
      if (recommendation.media_type === 'link') {
        setContentType('link');
        setLink(recommendation.media_url || '');
      } else if (recommendation.media_type === 'video') {
        // Check if it's a URL or uploaded file
        if (recommendation.media_url?.startsWith('http') && 
            (recommendation.media_url.includes('youtube') || recommendation.media_url.includes('vimeo'))) {
          setContentType('link');
          setLink(recommendation.media_url);
        } else {
          setContentType('video');
        }
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
      setVideoFile(null);
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

    if ((contentType === 'video' || contentType === 'record') && !videoFile && !recommendation) {
      toast.error('Por favor, selecione ou grave um vídeo');
      return;
    }

    setIsSubmitting(true);
    try {
      let mediaUrl = recommendation?.media_url || null;
      let mediaType = contentType === 'text' ? null : (contentType === 'record' ? 'video' : contentType);

      // Upload video file if selected or recorded
      if ((contentType === 'video' || contentType === 'record') && videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${patientId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('recommendations')
          .upload(filePath, videoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('recommendations')
          .getPublicUrl(filePath);

        mediaUrl = publicUrl;
        mediaType = 'video';
      }
      // Upload file if new file is selected
      else if (contentType === 'file' && file) {
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

  const handleVideoRecorded = (blob: Blob) => {
    const file = new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
    setVideoFile(file);
    setIsRecording(false);
    toast.success('Vídeo gravado com sucesso!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {recommendation ? 'Editar Recomendação' : 'Adicionar Recomendação'}
          </DialogTitle>
        </DialogHeader>
        
        {isRecording ? (
          <VideoRecorder
            onVideoRecorded={handleVideoRecorded}
            onCancel={() => setIsRecording(false)}
          />
        ) : (
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
                    Link / Vídeo URL
                  </div>
                </SelectItem>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video size={16} />
                    Upload de Vídeo
                  </div>
                </SelectItem>
                <SelectItem value="record">
                  <div className="flex items-center gap-2">
                    <Camera size={16} />
                    Gravar Vídeo
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

          {contentType === 'video' && !isRecording && (
            <div>
              <Label htmlFor="video">Arquivo de Vídeo *</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="video-upload-recommendation"
                  required={!recommendation}
                />
                <label htmlFor="video-upload-recommendation">
                  <Button type="button" variant="outline" className="w-full" asChild>
                    <span className="cursor-pointer flex items-center justify-center">
                      <Upload className="mr-2" size={16} />
                      {videoFile ? videoFile.name : recommendation?.media_url ? 'Alterar vídeo' : 'Selecionar vídeo (MP4, MOV, AVI)'}
                    </span>
                  </Button>
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: MP4, MOV, AVI, MKV
              </p>
            </div>
          )}

          {contentType === 'record' && (
            <div>
              <Label>Gravar Vídeo pela Webcam *</Label>
              <div className="mt-2">
                {!isRecording && !videoFile && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setIsRecording(true)}
                  >
                    <Camera className="mr-2" size={16} />
                    Abrir Câmera
                  </Button>
                )}
                {videoFile && !isRecording && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      ✓ Vídeo gravado com sucesso
                    </p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setVideoFile(null);
                        setIsRecording(true);
                      }}
                    >
                      <Camera className="mr-2" size={16} />
                      Gravar Novamente
                    </Button>
                  </div>
                )}
              </div>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
