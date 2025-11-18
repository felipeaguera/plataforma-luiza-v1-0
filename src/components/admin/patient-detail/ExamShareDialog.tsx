import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Copy, Printer, ExternalLink, QrCode, AlertCircle } from 'lucide-react';
import { useExamShare } from '@/hooks/useExamShares';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import logoAguera from '@/assets/logo-aguera-full.jpeg';
interface ExamShareDialogProps {
  examId: string;
  examTitle: string;
  examDate: string | null;
  patientName: string;
}
export function ExamShareDialog({
  examId,
  examTitle,
  examDate,
  patientName
}: ExamShareDialogProps) {
  const {
    share,
    isLoading,
    createShare,
    getShareUrl,
    copyShareUrl
  } = useExamShare(examId);
  const [isOpen, setIsOpen] = useState(false);
  const handleOpenDialog = async () => {
    // Se não há share, criar primeiro antes de abrir o dialog
    if (!share && !isLoading && !createShare.isPending) {
      createShare.mutate(undefined, {
        onSuccess: () => {
          setIsOpen(true);
        },
        onError: () => {
          setIsOpen(true); // Abre mesmo com erro para mostrar a mensagem
        }
      });
    } else {
      setIsOpen(true);
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
  return <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" onClick={handleOpenDialog} title="QR Code">
          <QrCode size={18} />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Acesso rápido ao laudo</DialogTitle>
        </DialogHeader>
        
        {isLoading || createShare.isPending || !share ? <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">
              {createShare.isPending ? 'Gerando link de acesso...' : 'Carregando...'}
            </p>
          </div> : createShare.isError ? <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <p className="text-sm text-center text-muted-foreground max-w-md">
              Não foi possível gerar o QR Code. Tente novamente ou contate o suporte.
            </p>
            <Button onClick={() => createShare.mutate()} variant="outline">
              Tentar novamente
            </Button>
          </div> : <>
            <div id="print-content" className="space-y-6 py-4">
              <div className="flex justify-center">
                <img src={logoAguera} alt="Clínica Agüera Dermatologia" className="h-24 object-contain" />
              </div>

              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold tracking-wide">AGUERA DERMATOLOGIA</h2>
              </div>

              <div className="space-y-3 bg-muted/30 p-6 rounded-lg border">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paciente:</p>
                  <p className="text-lg font-semibold">{patientName}</p>
                </div>
                {examDate && <div>
                    <p className="text-sm font-medium text-muted-foreground">Data do exame:</p>
                    <p className="text-lg font-semibold">
                      {new Date(examDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Exame:</p>
                  <p className="text-lg font-semibold">{examTitle}</p>
                </div>
              </div>

              <div className="flex justify-center py-6">
                <div className="bg-white p-6 rounded-lg shadow-md border-2">
                  <QRCodeSVG value={getShareUrl(share.token)} size={220} level="H" includeMargin />
                </div>
              </div>

              <div className="text-center space-y-2 text-sm text-muted-foreground">
                <p className="font-medium">Escaneie o QR Code para acessar o laudo</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center pt-4 print:hidden border-t">
              <Button onClick={() => copyShareUrl(share.token)} variant="default" size="lg">
                <Copy className="mr-2" size={18} />
                Copiar link
              </Button>

              <Button onClick={handlePrint} variant="default" size="lg">
                <Printer className="mr-2" size={18} />
                Imprimir
              </Button>

              <Button onClick={handleWhatsApp} variant="outline" size="lg">
                <ExternalLink className="mr-2" size={18} />
                WhatsApp
              </Button>
            </div>
          </>}
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
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 20px !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </Dialog>;
}