import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClinicNews } from '@/hooks/useClinicNews';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';

interface ClinicNewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  news?: any;
}

export function ClinicNewsDialog({ open, onOpenChange, news }: ClinicNewsDialogProps) {
  const { createNews, updateNews, isCreating, isUpdating } = useClinicNews();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'none'>('none');
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    if (news) {
      setTitle(news.title || '');
      setContent(news.content || '');
      setMediaType(news.media_type || 'none');
      setMediaUrl(news.media_url || '');
    } else {
      setTitle('');
      setContent('');
      setMediaType('none');
      setMediaUrl('');
    }
  }, [news, open]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      toast({
        title: 'Erro',
        description: 'Apenas imagens são permitidas no upload.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('news')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('news')
        .getPublicUrl(filePath);

      setMediaUrl(publicUrl);
      setMediaType('image');
      
      toast({
        title: 'Sucesso',
        description: 'Imagem enviada com sucesso!',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer upload da imagem.',
        variant: 'destructive',
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: 'Erro',
        description: 'O título é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    const newsData = {
      title: title.trim(),
      content: content.trim(),
      media_type: mediaType === 'none' ? null : mediaType,
      media_url: mediaType === 'none' ? null : mediaUrl.trim() || null,
    };

    try {
      if (news) {
        await updateNews({ id: news.id, data: newsData });
      } else {
        await createNews(newsData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving news:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {news ? 'Editar Novidade' : 'Nova Novidade'}
          </DialogTitle>
          <DialogDescription>
            {news 
              ? 'Atualize as informações da novidade.' 
              : 'Crie uma nova novidade para compartilhar com todas as pacientes.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Nova tecnologia disponível na clínica"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descreva a novidade..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mediaType">Tipo de Mídia</Label>
            <Select value={mediaType} onValueChange={(value: any) => setMediaType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem mídia</SelectItem>
                <SelectItem value="image">Imagem</SelectItem>
                <SelectItem value="video">Vídeo (URL)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mediaType === 'image' && (
            <div className="space-y-2">
              <Label>Imagem</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  disabled={uploadingFile}
                />
                {uploadingFile && <Loader2 className="animate-spin" size={20} />}
              </div>
              {mediaUrl && (
                <div className="relative mt-2">
                  <img 
                    src={mediaUrl} 
                    alt="Preview" 
                    className="w-full max-h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setMediaUrl('')}
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
            </div>
          )}

          {mediaType === 'video' && (
            <div className="space-y-2">
              <Label htmlFor="videoUrl">URL do Vídeo</Label>
              <Input
                id="videoUrl"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Cole o link do vídeo (YouTube, Vimeo, etc.)
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isCreating || isUpdating}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating}>
              {(isCreating || isUpdating) && <Loader2 className="mr-2 animate-spin" size={16} />}
              {news ? 'Salvar Alterações' : 'Criar Novidade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
