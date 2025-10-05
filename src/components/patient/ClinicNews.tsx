import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Newspaper } from 'lucide-react';

export function ClinicNews() {
  const { data: news = [], isLoading } = useQuery({
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper size={20} />
          Novidades da Clínica
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando novidades...</p>
        ) : news.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma novidade no momento</p>
        ) : (
          <div className="space-y-4">
            {news.map((item) => (
              <div key={item.id} className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">{item.title}</h4>
                <p className="text-sm text-foreground whitespace-pre-wrap mb-2">
                  {item.content}
                </p>
                {item.media_url && item.media_type === 'image' && (
                  <img 
                    src={item.media_url} 
                    alt={item.title}
                    className="w-full rounded-md mt-2"
                  />
                )}
                {item.media_url && item.media_type === 'video' && (
                  <video 
                    src={item.media_url} 
                    controls
                    className="w-full rounded-md mt-2"
                  />
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(item.published_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}