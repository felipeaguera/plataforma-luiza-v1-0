import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export function ClinicNewsTimeline() {
  const { data: news, isLoading } = useQuery({
    queryKey: ['clinic-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_news')
        .select('*')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="text-primary" size={20} />
            Novidades da Clínica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando novidades...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="text-primary" size={20} />
          Novidades da Clínica
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!news || news.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma novidade publicada ainda
          </p>
        ) : (
          <div className="space-y-6">
            {news.map((item, index) => (
              <div key={item.id} className="relative">
                {index !== news.length - 1 && (
                  <div className="absolute left-3 top-8 bottom-0 w-px bg-border" />
                )}
                <div className="flex gap-4">
                  <div className="relative z-10 flex-shrink-0 w-6 h-6 bg-primary rounded-full border-4 border-background" />
                  <div className="flex-1 pb-6">
                    <div className="bg-accent/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-semibold text-foreground">{item.title}</h4>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(item.published_at || item.created_at)}
                        </p>
                      </div>
                      <p className="text-foreground">{item.content}</p>
                      
                      {item.media_url && item.media_type === 'image' && (
                        <div className="mt-3 rounded-lg overflow-hidden">
                          <img
                            src={item.media_url}
                            alt={item.title}
                            className="w-full h-auto"
                          />
                        </div>
                      )}
                      
                      {item.media_url && item.media_type === 'video' && (
                        <div className="mt-3 aspect-video rounded-lg overflow-hidden bg-black">
                          <video
                            controls
                            className="w-full h-full"
                            src={item.media_url}
                          >
                            Seu navegador não suporta vídeos.
                          </video>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
