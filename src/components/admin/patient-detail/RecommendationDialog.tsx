import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RecommendationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  recommendation?: any;
}

export function RecommendationDialog({ open, onOpenChange, patientId, recommendation }: RecommendationDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (recommendation) {
      setTitle(recommendation.title);
      setContent(recommendation.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [recommendation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setIsSubmitting(true);
    try {
      if (recommendation) {
        const { error } = await supabase
          .from('recommendations')
          .update({
            title,
            content,
          })
          .eq('id', recommendation.id);

        if (error) throw error;
        toast.success('Recomendação atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('recommendations')
          .insert({
            patient_id: patientId,
            title,
            content,
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
