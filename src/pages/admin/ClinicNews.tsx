import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { ClinicNewsDialog } from '@/components/admin/ClinicNewsDialog';
import { useClinicNews } from '@/hooks/useClinicNews';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ClinicNewsPage() {
  const navigate = useNavigate();
  const { news, isLoading, publishNews, unpublishNews, deleteNews } = useClinicNews();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState<string | null>(null);

  const handleEdit = (newsItem: any) => {
    setSelectedNews(newsItem);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedNews(null);
    setIsDialogOpen(true);
  };

  const handleTogglePublish = async (newsItem: any) => {
    if (newsItem.published_at) {
      await unpublishNews(newsItem.id);
    } else {
      await publishNews(newsItem.id);
    }
  };

  const handleDeleteClick = (id: string) => {
    setNewsToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (newsToDelete) {
      await deleteNews(newsToDelete);
      setDeleteDialogOpen(false);
      setNewsToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="mr-2" size={18} />
              Voltar ao Dashboard
            </Button>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2" size={18} />
            Nova Novidade
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Novidades da Clínica</h1>
          <p className="text-muted-foreground">
            Gerencie as novidades que aparecem na timeline de todas as pacientes
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground py-8">Carregando novidades...</p>
            </CardContent>
          </Card>
        ) : news.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground py-8">
                Nenhuma novidade cadastrada ainda. Clique em "Nova Novidade" para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {news.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                        <Badge variant={item.published_at ? 'default' : 'secondary'}>
                          {item.published_at ? 'Publicado' : 'Rascunho'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {item.published_at
                          ? `Publicado em ${formatDate(item.published_at)}`
                          : `Criado em ${formatDate(item.created_at)}`}
                      </p>

                      {item.content && (
                        <p className="text-foreground line-clamp-2">{item.content}</p>
                      )}

                      {item.media_type && (
                        <Badge variant="outline" className="mt-2">
                          {item.media_type === 'image' ? '📷 Imagem' : '🎥 Vídeo'}
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleTogglePublish(item)}
                        title={item.published_at ? 'Despublicar' : 'Publicar'}
                      >
                        {item.published_at ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(item)}
                        title="Editar"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteClick(item.id)}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  {item.media_url && item.media_type === 'image' && (
                    <div className="mt-4 rounded-xl overflow-hidden border-2 border-border">
                      <img
                        src={item.media_url}
                        alt={item.title}
                        className="w-full max-h-64 object-cover"
                        onError={(e) => {
                          console.error('Erro ao carregar imagem:', item.media_url);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={(e) => {
                          console.log('Imagem carregada com sucesso:', item.media_url);
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <ClinicNewsDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          news={selectedNews}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta novidade? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
