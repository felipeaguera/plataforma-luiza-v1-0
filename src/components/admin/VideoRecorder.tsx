import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Square, Play, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface VideoRecorderProps {
  onVideoRecorded: (blob: Blob) => void;
  onCancel: () => void;
}

export function VideoRecorder({ onVideoRecorded, onCancel }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Erro ao acessar câmera. Verifique as permissões.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp8,opus',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setIsPreviewing(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopCamera();
    }
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    setIsPreviewing(false);
    setRecordingTime(0);
    startCamera();
  };

  const confirmRecording = () => {
    if (recordedBlob) {
      onVideoRecorded(recordedBlob);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={!isPreviewing}
          className="w-full h-full object-cover"
        />
        
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="font-mono text-sm">{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-3">
        {!isPreviewing ? (
          <>
            {!isRecording ? (
              <>
                <Button onClick={startRecording} size="lg">
                  <Video className="mr-2" size={20} />
                  Iniciar Gravação
                </Button>
                <Button onClick={onCancel} variant="outline" size="lg">
                  Cancelar
                </Button>
              </>
            ) : (
              <Button onClick={stopRecording} variant="destructive" size="lg">
                <Square className="mr-2" size={20} />
                Parar Gravação
              </Button>
            )}
          </>
        ) : (
          <>
            <Button onClick={() => {
              if (videoRef.current) {
                videoRef.current.play();
              }
            }} variant="outline" size="lg">
              <Play className="mr-2" size={20} />
              Reproduzir
            </Button>
            <Button onClick={discardRecording} variant="outline" size="lg">
              <Trash2 className="mr-2" size={20} />
              Descartar
            </Button>
            <Button onClick={confirmRecording} size="lg">
              <Check className="mr-2" size={20} />
              Usar Este Vídeo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
