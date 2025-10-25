import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, FileText, PlayCircle, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getVideoEmbedUrl, isDirectVideoUrl } from '@/lib/videoUtils';

interface PatientRecommendationsListProps {
  patientId: string;
}

export function PatientRecommendationsList({ patientId }: PatientRecommendationsListProps) {
  const queryClient = useQueryClient();

  const { data: recommendations, isLoading } = useQuery({
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

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('recommendations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recommendations',
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['patient-recommendations', patientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, queryClient]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="text-primary" size={20} />
            Minhas Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando recomendações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Video className="text-primary" size={20} />
          Minhas Recomendações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!recommendations || recommendations.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full mb-4">
              <Sparkles className="text-primary" size={32} />
            </div>
            <p className="text-muted-foreground">Nenhuma recomendação disponível no momento</p>
            <p className="text-xs text-muted-foreground mt-2">Você será notificada quando novas recomendações forem adicionadas</p>
          </div>
        ) : (
          <div className="space-y-6">
            {recommendations.map((recommendation) => (
              <div 
                key={recommendation.id} 
                className="group relative overflow-hidden border-2 rounded-xl p-5 hover:shadow-lg hover:border-primary/20 transition-all bg-gradient-to-br from-card to-card/50"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {recommendation.media_type === 'video' && (
                          <div className="p-1.5 bg-primary/10 rounded-md">
                            <PlayCircle className="text-primary" size={16} />
                          </div>
                        )}
                        <h4 className="font-semibold text-foreground text-lg">{recommendation.title}</h4>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {format(new Date(recommendation.published_at || recommendation.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </Badge>
                    </div>
                  </div>

                  {recommendation.content && (
                    <div className="prose prose-sm max-w-none">
                      <p className="text-foreground leading-relaxed">{recommendation.content}</p>
                    </div>
                  )}

                  {recommendation.media_url && recommendation.media_type === 'video' && (
                    <div className="aspect-video rounded-xl overflow-hidden shadow-lg border-2 border-border">
                      {isDirectVideoUrl(recommendation.media_url) ? (
                        <video
                          controls
                          className="w-full h-full bg-black"
                          src={recommendation.media_url}
                        >
                          Seu navegador não suporta vídeos.
                        </video>
                      ) : (
                        <iframe
                          src={getVideoEmbedUrl(recommendation.media_url) || recommendation.media_url}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={recommendation.title}
                        />
                      )}
                    </div>
                  )}

                  {recommendation.media_url && recommendation.media_type === 'image' && (
                    <div className="rounded-xl overflow-hidden shadow-lg border-2 border-border">
                      <img
                        src={recommendation.media_url}
                        alt={recommendation.title}
                        className="w-full h-auto"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
