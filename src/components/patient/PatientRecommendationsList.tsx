import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, FileText } from 'lucide-react';
import { useEffect } from 'react';

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
        <CardTitle className="flex items-center gap-2">
          <Video className="text-primary" size={20} />
          Minhas Recomendações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!recommendations || recommendations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma recomendação disponível no momento
          </p>
        ) : (
          <div className="space-y-6">
            {recommendations.map((recommendation) => (
              <div key={recommendation.id} className="border border-border rounded-lg p-4 space-y-3">
                <div>
                  <h4 className="font-semibold text-foreground text-lg">{recommendation.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(recommendation.published_at || recommendation.created_at)}
                  </p>
                </div>

                {recommendation.content && (
                  <p className="text-foreground">{recommendation.content}</p>
                )}

                {recommendation.media_url && recommendation.media_type === 'video' && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <video
                      controls
                      className="w-full h-full"
                      src={recommendation.media_url}
                    >
                      Seu navegador não suporta vídeos.
                    </video>
                  </div>
                )}

                {recommendation.media_url && recommendation.media_type === 'image' && (
                  <div className="rounded-lg overflow-hidden">
                    <img
                      src={recommendation.media_url}
                      alt={recommendation.title}
                      className="w-full h-auto"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
