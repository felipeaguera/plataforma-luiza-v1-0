import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Copy, RefreshCw, Printer, ExternalLink, QrCode } from 'lucide-react';
import { useExamShare } from '@/hooks/useExamShares';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ExamShareDialogProps {
  examId: string;
  examTitle: string;
  examDate: string | null;
  patientName: string;
}

export function ExamShareDialog({ examId, examTitle, examDate, patientName }: ExamShareDialogProps) {
  const { share, isLoading, createShare, getShareUrl, copyShareUrl } = useExamShare(examId);
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenDialog = () => {
    setIsOpen(true);
    if (!share && !isLoading) {
      createShare.mutate();
    }
  };

  const handleWhatsApp = () => {
    if (!share) return;
    const shareUrl = getShareUrl(share.token);
    const message = `Olá! Aqui está o acesso ao seu laudo: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpenDialog}
          title="QR Code"
        >
          <QrCode size={18} />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Acesso rápido ao laudo</DialogTitle>
        </DialogHeader>
        
        {isLoading || !share ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
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
                  <QRCodeSVG value={getShareUrl(share.token)} size={240} level="H" />
                </div>
                <p className="text-center text-sm text-muted-foreground max-w-md">
                  Escaneie o QR code com a câmera do seu celular para acessar o laudo digital
                </p>
              </div>

              <div className="text-center text-xs text-muted-foreground space-y-1 pt-4 border-t">
                <p>Link de acesso: {getShareUrl(share.token)}</p>
                <p>Este QR code dá acesso seguro ao laudo médico</p>
              </div>

              {share.view_count > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Visualizado {share.view_count} {share.view_count === 1 ? 'vez' : 'vezes'}
                  {share.last_view_at && ` • Último acesso: ${new Date(share.last_view_at).toLocaleDateString('pt-BR')}`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-4">
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
          </>
        )}
      </DialogContent>

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
    </Dialog>
  );
}
