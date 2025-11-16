import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useExamShare(examId: string) {
  const queryClient = useQueryClient();

  // Fetch active share for this exam
  const { data: share, isLoading } = useQuery({
    queryKey: ['exam-share', examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_shares')
        .select('*')
        .eq('documento_id', examId)
        .is('revogado_em', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return data;
    },
  });

  // Create or regenerate share link
  const createShare = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_exam_share', {
        exam_id: examId,
      });

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-share', examId] });
      toast.success('Link gerado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating share:', error);
      toast.error('Erro ao gerar link');
    },
  });

  // Get the share URL
  const getShareUrl = (token: string) => {
    return `${window.location.origin}/r/${token}`;
  };

  // Copy share URL to clipboard
  const copyShareUrl = async (token: string) => {
    const url = getShareUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  return {
    share,
    isLoading,
    createShare,
    getShareUrl,
    copyShareUrl,
  };
}
