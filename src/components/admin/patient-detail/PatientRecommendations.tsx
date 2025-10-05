import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit } from 'lucide-react';
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
                    <h4 className="font-medium">{recommendation.title}</h4>
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
                  <p className="text-sm text-foreground whitespace-pre-wrap mb-2">
                    {recommendation.content}
                  </p>
                  <p className="text-xs text-muted-foreground">
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
