import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, FileText, Link2, Download, ExternalLink, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RecommendationDialog } from './RecommendationDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface PatientRecommendationsProps {
  patientId: string;
}

export function PatientRecommendations({ patientId }: PatientRecommendationsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecommendation, setEditingRecommendation] = useState<any>(null);
  const [recommendationToDelete, setRecommendationToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['recommendations', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { mutateAsync: deleteRecommendation } = useMutation({
    mutationFn: async (recommendationId: string) => {
      const rec = recommendations.find(r => r.id === recommendationId);
      
      // Delete file from storage if exists
      if (rec?.media_type === 'file' && rec?.media_url) {
        const path = rec.media_url.split('/recommendations/')[1];
        if (path) {
          await supabase.storage.from('recommendations').remove([path]);
        }
      }
      
      const { error } = await supabase
        .from('recommendations')
        .delete()
        .eq('id', recommendationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Recomendação excluída com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['recommendations', patientId] });
      setRecommendationToDelete(null);
    },
    onError: () => {
      toast.error('Erro ao excluir recomendação');
    },
  });

  const handleEdit = (recommendation: any) => {
    setEditingRecommendation(recommendation);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRecommendation(null);
  };

  const renderRecommendationContent = (recommendation: any) => {
    if (recommendation.media_type === 'video' && recommendation.media_url) {
      // Extract YouTube video ID
      let videoId = '';
      if (recommendation.media_url.includes('youtube.com')) {
        videoId = recommendation.media_url.split('v=')[1]?.split('&')[0];
      } else if (recommendation.media_url.includes('youtu.be')) {
        videoId = recommendation.media_url.split('youtu.be/')[1]?.split('?')[0];
      }

      if (videoId) {
        return (
          <div className="mt-2">
            <div className="aspect-video w-full">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={recommendation.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-md"
              />
            </div>
          </div>
        );
      }
    }

    if (recommendation.media_type === 'link' && recommendation.media_url) {
      return (
        <div className="mt-2">
          <a
            href={recommendation.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink size={16} />
            Abrir link
          </a>
        </div>
      );
    }

    if (recommendation.media_type === 'file' && recommendation.media_url) {
      return (
        <div className="mt-2">
          <a
            href={recommendation.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <Download size={16} />
            Baixar PDF
          </a>
        </div>
      );
    }

    if (recommendation.content) {
      return (
        <p className="text-sm text-foreground whitespace-pre-wrap mt-2">
          {recommendation.content}
        </p>
      );
    }

    return null;
  };

  const getRecommendationIcon = (recommendation: any) => {
    if (recommendation.media_type === 'video') return <Video size={20} className="text-primary" />;
    if (recommendation.media_type === 'link') return <Link2 size={20} className="text-primary" />;
    if (recommendation.media_type === 'file') return <FileText size={20} className="text-primary" />;
    return <FileText size={20} className="text-primary" />;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recomendações Específicas</CardTitle>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2" size={16} />
            Adicionar Recomendação
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando recomendações...</p>
          ) : recommendations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma recomendação cadastrada</p>
          ) : (
            <div className="space-y-4">
              {recommendations.map((recommendation) => (
                <div key={recommendation.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getRecommendationIcon(recommendation)}
                      <h4 className="font-medium">{recommendation.title}</h4>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(recommendation)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRecommendationToDelete(recommendation.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  {renderRecommendationContent(recommendation)}
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(recommendation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RecommendationDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        patientId={patientId}
        recommendation={editingRecommendation}
      />

      <AlertDialog open={!!recommendationToDelete} onOpenChange={() => setRecommendationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta recomendação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => recommendationToDelete && deleteRecommendation(recommendationToDelete)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
