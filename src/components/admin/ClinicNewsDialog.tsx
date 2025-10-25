import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useClinicNews } from '@/hooks/useClinicNews';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setUploadProgress(10);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      setUploadProgress(30);
      const { error: uploadError } = await supabase.storage
        .from('news')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(60);
      const { data: { publicUrl } } = supabase.storage
        .from('news')
        .getPublicUrl(filePath);

      setMediaUrl(publicUrl);
      setMediaType('image');
      setUploadProgress(100);
      
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
      setTimeout(() => setUploadProgress(0), 500);
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
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      handleFileUpload(droppedFile);
    } else {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione apenas imagens',
        variant: 'destructive',
      });
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
        const { data: newsResult, error: createError } = await supabase
          .from('clinic_news')
          .insert({
            ...newsData,
            published_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;

        // Send notification to all patients who opted in
        if (newsResult) {
          const { error: notificationError } = await supabase.functions.invoke(
            "send-notification",
            {
              body: {
                tipo: "novidade",
                ref_id: newsResult.id,
              },
            }
          );

          if (notificationError) {
            console.error("Error sending notification:", notificationError);
          }
        }

        toast({
          title: 'Sucesso',
          description: 'Novidade publicada e pacientes notificados!',
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving news:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a novidade.',
        variant: 'destructive',
      });
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
            <div className="space-y-3">
              <Label>Imagem</Label>
              
              {!mediaUrl ? (
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer",
                    isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50",
                    uploadingFile && "pointer-events-none opacity-60"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
                  
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="p-4 bg-primary/10 rounded-full">
                      {uploadingFile ? (
                        <Loader2 className="animate-spin text-primary" size={32} />
                      ) : (
                        <ImageIcon className="text-primary" size={32} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {uploadingFile ? 'Enviando imagem...' : 'Arraste sua imagem aqui'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        ou clique para selecionar
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, WEBP até 5MB
                      </p>
                    </div>
                  </div>
                  
                  {uploadingFile && uploadProgress > 0 && (
                    <div className="mt-4">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        {uploadProgress}%
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative group rounded-xl overflow-hidden border-2 border-border hover:border-primary/50 transition-all">
                  <img 
                    src={mediaUrl} 
                    alt="Preview" 
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      console.error('Erro ao carregar imagem:', mediaUrl);
                      toast({
                        title: 'Erro',
                        description: 'Não foi possível carregar a imagem. Tente fazer upload novamente.',
                        variant: 'destructive',
                      });
                    }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={16} className="mr-2" />
                      Trocar imagem
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setMediaUrl('');
                        setMediaType('none');
                      }}
                    >
                      <X size={16} className="mr-2" />
                      Remover
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />
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
