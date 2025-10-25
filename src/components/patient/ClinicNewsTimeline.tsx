import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { getVideoEmbedUrl, isDirectVideoUrl } from '@/lib/videoUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ClinicNewsTimeline() {
  const queryClient = useQueryClient();

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

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('clinic-news-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clinic_news',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['clinic-news'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="text-primary" size={22} />
          Novidades da Clínica
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {!news || news.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full mb-4">
              <Bell className="text-primary" size={32} />
            </div>
            <p className="text-muted-foreground">Nenhuma novidade publicada ainda</p>
            <p className="text-xs text-muted-foreground mt-2">Fique atenta! Publicaremos novidades em breve</p>
          </div>
        ) : (
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {news.map((item) => (
                <CarouselItem key={item.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className="h-full">
                    <div className="group relative overflow-hidden rounded-2xl border-2 border-border hover:border-primary/50 transition-all bg-gradient-to-br from-card to-card/50 h-full flex flex-col shadow-lg hover:shadow-xl">
                      {/* Header com título e data */}
                      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-bold text-foreground text-base line-clamp-2 flex-1">
                            {item.title}
                          </h4>
                        </div>
                        <Badge variant="secondary" className="text-xs mt-2">
                          <Calendar size={12} className="mr-1" />
                          {format(new Date(item.published_at || item.created_at), "dd MMM, yyyy", { locale: ptBR })}
                        </Badge>
                      </div>

                      {/* Mídia - Imagem ou Vídeo */}
                      {item.media_url && item.media_type === 'image' && (
                        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
                          <img
                            src={item.media_url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {item.media_url && item.media_type === 'video' && (
                        <div className="relative aspect-video overflow-hidden bg-black">
                          {isDirectVideoUrl(item.media_url) ? (
                            <video
                              controls
                              className="w-full h-full"
                              src={item.media_url}
                            >
                              Seu navegador não suporta vídeos.
                            </video>
                          ) : (
                            <iframe
                              src={getVideoEmbedUrl(item.media_url) || item.media_url}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title={item.title}
                            />
                          )}
                        </div>
                      )}

                      {/* Conteúdo */}
                      <div className="p-4 flex-1">
                        <p className="text-foreground text-sm leading-relaxed line-clamp-4">
                          {item.content}
                        </p>
                      </div>

                      {/* Indicador de novo */}
                      {news.indexOf(item) === 0 && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-primary text-primary-foreground shadow-lg animate-pulse">
                            <Sparkles size={12} className="mr-1" />
                            Novo
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center gap-2 mt-6">
              <CarouselPrevious className="relative static transform-none" />
              <CarouselNext className="relative static transform-none" />
            </div>
          </Carousel>
        )}
      </CardContent>
    </Card>
  );
}
