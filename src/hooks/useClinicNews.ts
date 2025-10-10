import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ClinicNewsCreateData {
  title: string;
  content: string;
  media_type?: 'image' | 'video' | null;
  media_url?: string | null;
}

export function useClinicNews() {
  const queryClient = useQueryClient();

  const { data: news = [], isLoading } = useQuery({
    queryKey: ['clinic-news-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_news')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { mutateAsync: createNews, isPending: isCreating } = useMutation({
    mutationFn: async (newsData: ClinicNewsCreateData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('clinic_news')
        .insert([{
          ...newsData,
          created_by: user?.id,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-news-admin'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-news'] });
      toast({
        title: 'Sucesso',
        description: 'Novidade criada com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a novidade.',
        variant: 'destructive',
      });
      console.error('Error creating news:', error);
    },
  });

  const { mutateAsync: updateNews, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClinicNewsCreateData> }) => {
      const { data: updated, error } = await supabase
        .from('clinic_news')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-news-admin'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-news'] });
      toast({
        title: 'Sucesso',
        description: 'Novidade atualizada com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a novidade.',
        variant: 'destructive',
      });
      console.error('Error updating news:', error);
    },
  });

  const { mutateAsync: publishNews, isPending: isPublishing } = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('clinic_news')
        .update({ published_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Send notification
      const { error: notificationError } = await supabase.functions.invoke(
        "send-notification",
        {
          body: {
            tipo: "novidade",
            ref_id: id,
          },
        }
      );

      if (notificationError) {
        console.error("Error sending notification:", notificationError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-news-admin'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-news'] });
      toast({
        title: 'Publicado!',
        description: 'A novidade foi publicada e pacientes foram notificados.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível publicar a novidade.',
        variant: 'destructive',
      });
      console.error('Error publishing news:', error);
    },
  });

  const { mutateAsync: unpublishNews, isPending: isUnpublishing } = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('clinic_news')
        .update({ published_at: null })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-news-admin'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-news'] });
      toast({
        title: 'Despublicado',
        description: 'A novidade foi despublicada e não está mais visível.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível despublicar a novidade.',
        variant: 'destructive',
      });
      console.error('Error unpublishing news:', error);
    },
  });

  const { mutateAsync: deleteNews, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clinic_news')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-news-admin'] });
      queryClient.invalidateQueries({ queryKey: ['clinic-news'] });
      toast({
        title: 'Excluído',
        description: 'A novidade foi excluída com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a novidade.',
        variant: 'destructive',
      });
      console.error('Error deleting news:', error);
    },
  });

  return {
    news,
    isLoading,
    createNews,
    isCreating,
    updateNews,
    isUpdating,
    publishNews,
    isPublishing,
    unpublishNews,
    isUnpublishing,
    deleteNews,
    isDeleting,
  };
}
