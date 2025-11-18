import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle, Copy, Printer } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import logoAguera from '@/assets/logo-aguera-full.jpeg';

export default function ExamShare() {
  const { token } = useParams<{ token: string }>();

  const { data: shareData, isLoading, error } = useQuery({
    queryKey: ['exam-share-public', token],
    queryFn: async () => {
      if (!token) throw new Error('Token não fornecido');

      // Get the share record
      const { data: share, error: shareError } = await supabase
        .from('document_shares')
        .select('*, exams(*)')
        .eq('token', token)
        .is('revogado_em', null)
        .single();

      if (shareError) throw shareError;

      // Check if expired
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        throw new Error('Link expirado');
      }

      return share;
    },
  });

  // Increment view count when component loads
  useEffect(() => {
    if (shareData && token) {
      supabase.rpc('increment_share_view', { share_token: token });
    }
  }, [shareData, token]);

  const handleViewExam = async () => {
    if (!shareData?.exams?.file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('exams')
        .createSignedUrl(shareData.exams.file_path, 3600); // 1 hour expiry

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing exam:', error);
      toast.error('Erro ao visualizar laudo');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Link não disponível</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Este link não está mais disponível. Solicite um novo acesso à clínica.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full print-content">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img 
                src={logoAguera}
                alt="Clínica Agüera Dermatologia" 
                className="h-24 object-contain"
              />
            </div>
            <CardTitle className="text-xl font-bold tracking-wide">AGÜERA DERMATOLOGIA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6 space-y-3 border">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Exame:</p>
                <p className="text-lg font-semibold">{shareData.exams.title}</p>
              </div>
              {shareData.exams.exam_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data do exame:</p>
                  <p className="text-lg font-semibold">
                    {new Date(shareData.exams.exam_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>

            <Button 
              onClick={handleViewExam} 
              className="w-full"
              size="lg"
            >
              <FileText className="mr-2" size={20} />
              Visualizar laudo em PDF
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="default"
                onClick={handleCopyLink}
                className="w-full"
                size="lg"
              >
                <Copy className="mr-2" size={18} />
                Copiar link
              </Button>
              
              <Button
                variant="default"
                onClick={handlePrint}
                className="w-full"
                size="lg"
              >
                <Printer className="mr-2" size={18} />
                Imprimir
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground pt-4 border-t">
              <p className="font-medium">Acesso seguro ao seu documento médico</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
