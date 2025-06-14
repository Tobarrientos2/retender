import { useState, useRef, useCallback } from 'react';

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  recordedBlob: Blob | null;
  error: string | null;
}

export interface UseScreenRecorderReturn {
  state: RecordingState;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearRecording: () => void;
}

export function useScreenRecorder(): UseScreenRecorderReturn {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    recordedBlob: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateDuration = useCallback(() => {
    if (startTimeRef.current > 0) {
      const elapsed = Date.now() - startTimeRef.current;
      setState(prev => ({ ...prev, duration: Math.floor(elapsed / 1000) }));
    }
  }, []);

  const startDurationTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(updateDuration, 1000);
  }, [updateDuration]);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Verificar soporte del navegador
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Tu navegador no soporta grabación de pantalla');
      }

      // Solicitar permisos para capturar pantalla + audio
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen' as any,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100,
          channelCount: 2
        }
      });

      streamRef.current = stream;

      // Verificar si se capturó audio
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn('No se detectó audio del sistema. Asegúrate de seleccionar "Compartir audio" en el diálogo.');
      }

      // Configurar MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000   // 128 kbps
      });

      chunksRef.current = [];

      // Event handlers
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setState(prev => ({
          ...prev,
          recordedBlob: blob,
          isRecording: false,
          isPaused: false
        }));
        stopDurationTimer();
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setState(prev => ({
          ...prev,
          error: 'Error durante la grabación',
          isRecording: false,
          isPaused: false
        }));
        stopDurationTimer();
      };

      // Manejar cuando el usuario detiene la compartición desde el navegador
      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && state.isRecording) {
          stopRecording();
        }
      };

      // Iniciar grabación
      mediaRecorderRef.current.start(1000); // Chunk cada segundo
      setState(prev => ({ ...prev, isRecording: true, duration: 0 }));
      startDurationTimer();

    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error desconocido al iniciar grabación',
        isRecording: false
      }));
    }
  }, [state.isRecording, startDurationTimer, stopDurationTimer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      
      // Detener todas las pistas del stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
    }
  }, [state.isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
      stopDurationTimer();
    }
  }, [state.isRecording, state.isPaused, stopDurationTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
      startDurationTimer();
    }
  }, [state.isRecording, state.isPaused, startDurationTimer]);

  const clearRecording = useCallback(() => {
    setState(prev => ({
      ...prev,
      recordedBlob: null,
      duration: 0,
      error: null
    }));
    chunksRef.current = [];
  }, []);

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
  };
}

// Utility function para formatear duración
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Utility function para obtener información del archivo
export function getRecordingInfo(blob: Blob) {
  const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
  return {
    size: `${sizeInMB} MB`,
    type: blob.type,
    url: URL.createObjectURL(blob)
  };
}
