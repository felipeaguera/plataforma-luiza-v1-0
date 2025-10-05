import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Link2, Video, Play, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PatientRecommendationsViewProps {
  patientId: string;
}

export function PatientRecommendationsView({ patientId }: PatientRecommendationsViewProps) {
  const [viewingVideo, setViewingVideo] = useState<any>(null);

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['patient-recommendations', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('patient_id', patientId)
        .not('published_at', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getRecommendationIcon = (recommendation: any) => {
    if (recommendation.media_type === 'video') return <Video size={20} className="text-primary" />;
    if (recommendation.media_type === 'link') return <Link2 size={20} className="text-primary" />;
    if (recommendation.media_type === 'file') return <FileText size={20} className="text-primary" />;
    return <FileText size={20} className="text-primary" />;
  };

  const renderRecommendationContent = (recommendation: any) => {
    if (recommendation.media_type === 'video' && recommendation.media_url) {
      return (
        <div className="mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewingVideo(recommendation)}
            className="gap-2"
          >
            <Play size={16} />
            Visualizar vídeo
          </Button>
        </div>
      );
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recomendações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando recomendações...</p>
          ) : recommendations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma recomendação disponível</p>
          ) : (
            <div className="space-y-4">
              {recommendations.map((recommendation) => (
                <div key={recommendation.id} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    {getRecommendationIcon(recommendation)}
                    <div className="flex-1">
                      <h4 className="font-medium">{recommendation.title}</h4>
                      {renderRecommendationContent(recommendation)}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(recommendation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewingVideo} onOpenChange={() => setViewingVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewingVideo?.title}</DialogTitle>
          </DialogHeader>
          {viewingVideo && (() => {
            const isYouTube = viewingVideo.media_url.includes('youtube.com') || viewingVideo.media_url.includes('youtu.be');
            
            if (isYouTube) {
              let videoId = '';
              if (viewingVideo.media_url.includes('youtube.com')) {
                videoId = viewingVideo.media_url.split('v=')[1]?.split('&')[0];
              } else if (viewingVideo.media_url.includes('youtu.be')) {
                videoId = viewingVideo.media_url.split('youtu.be/')[1]?.split('?')[0];
              }

              if (videoId) {
                return (
                  <div className="aspect-video w-full mt-4">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={viewingVideo.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="rounded-md"
                    />
                  </div>
                );
              }
            }
            
            return (
              <div className="w-full mt-4">
                <video
                  controls
                  autoPlay
                  className="w-full rounded-md"
                  style={{ maxHeight: '70vh' }}
                  src={viewingVideo.media_url}
                >
                  Seu navegador não suporta a tag de vídeo.
                </video>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}