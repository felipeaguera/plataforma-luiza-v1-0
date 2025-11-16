import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, RefreshCw, Printer, ExternalLink } from 'lucide-react';
import { useExamShare } from '@/hooks/useExamShares';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ExamShareBlockProps {
  examId: string;
  examTitle: string;
  examDate: string | null;
  patientName: string;
}

export function ExamShareBlock({ examId, examTitle, examDate, patientName }: ExamShareBlockProps) {
  const { share, isLoading, createShare, getShareUrl, copyShareUrl } = useExamShare(examId);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  // Auto-generate share link if it doesn't exist
  useEffect(() => {
    if (!isLoading && !share) {
      createShare.mutate();
    }
  }, [isLoading, share]);

  if (isLoading || !share) {
    return (
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center justify-center py-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  const shareUrl = getShareUrl(share.token);

  const handlePrint = () => {
    setIsPrintDialogOpen(true);
  };

  const handleWhatsApp = () => {
    const message = `Olá! Aqui está o acesso ao seu laudo: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      <Card className="p-4 bg-muted/30 border-primary/20">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Acesso rápido ao laudo</h4>
          
          <div className="flex justify-center py-2">
            <div className="bg-white p-3 rounded-lg">
              <QRCodeSVG value={shareUrl} size={160} level="M" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyShareUrl(share.token)}
            >
              <Copy className="mr-2" size={16} />
              Copiar link
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => createShare.mutate()}
              disabled={createShare.isPending}
            >
              <RefreshCw className={`mr-2 ${createShare.isPending ? 'animate-spin' : ''}`} size={16} />
              Novo link
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
            >
              <Printer className="mr-2" size={16} />
              Imprimir
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
            >
              <ExternalLink className="mr-2" size={16} />
              WhatsApp
            </Button>
          </div>

          {share.view_count > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Visualizado {share.view_count} {share.view_count === 1 ? 'vez' : 'vezes'}
              {share.last_view_at && ` • Último acesso: ${new Date(share.last_view_at).toLocaleDateString('pt-BR')}`}
            </p>
          )}
        </div>
      </Card>

      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Imprimir laudo com QR Code</DialogTitle>
          </DialogHeader>
          
          <div id="print-content" className="space-y-6 py-4">
            <div className="flex justify-center">
              <img 
                src="/logo-aguera.jpeg" 
                alt="Clínica Agüera" 
                className="h-20 object-contain"
              />
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Clínica Agüera</h2>
              <p className="text-lg text-muted-foreground">Acesso Digital ao Laudo</p>
            </div>

            <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paciente:</p>
                <p className="text-lg font-medium">{patientName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Exame:</p>
                <p className="text-lg font-medium">{examTitle}</p>
              </div>
              {examDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data do exame:</p>
                  <p className="text-lg font-medium">
                    {new Date(examDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <QRCodeSVG value={shareUrl} size={240} level="H" />
              </div>
              <p className="text-center text-sm text-muted-foreground max-w-md">
                Escaneie o QR code com a câmera do seu celular para acessar o laudo digital
              </p>
            </div>

            <div className="text-center text-xs text-muted-foreground space-y-1 pt-4 border-t">
              <p>Link de acesso: {shareUrl}</p>
              <p>Este QR code dá acesso seguro ao laudo médico</p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => copyShareUrl(share.token)}
            >
              <Copy className="mr-2" size={16} />
              Copiar link
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2" size={16} />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-content, #print-content * {
            visibility: visible;
          }
          #print-content {
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
