import { useState, useRef, useCallback } from 'react';
import { useSilenceDetectionSettings } from './useRecordingSettings';

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  recordedBlob: Blob | null;
  error: string | null;
  // Nuevos estados para detección de silencio
  hasDetectedSound: boolean;
  silenceCountdown: number;
  currentVolume: number;
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
  // Obtener configuraciones del usuario desde Convex
  const silenceSettings = useSilenceDetectionSettings();

  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    recordedBlob: null,
    error: null,
    hasDetectedSound: false,
    silenceCountdown: 0,
    currentVolume: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Referencias para detección de silencio
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const volumeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasDetectedSoundRef = useRef<boolean>(false);
  const silenceStartTimeRef = useRef<number | null>(null);

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

  const clearAutoStopTimer = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  }, []);

  const clearSilenceDetection = useCallback(() => {
    if (silenceDetectionRef.current) {
      clearTimeout(silenceDetectionRef.current);
      silenceDetectionRef.current = null;
    }
    if (volumeCheckIntervalRef.current) {
      clearInterval(volumeCheckIntervalRef.current);
      volumeCheckIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const setupSilenceDetection = useCallback((stream: MediaStream) => {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('No hay pistas de audio para detectar silencio');
      return;
    }

    try {
      // Resetear refs
      hasDetectedSoundRef.current = false;
      silenceStartTimeRef.current = null;

      // Crear contexto de audio
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioContext = audioContextRef.current;

      // Crear analizador
      analyserRef.current = audioContext.createAnalyser();
      const analyser = analyserRef.current;
      analyser.fftSize = 1024;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      // Crear fuente desde el stream
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Configuración de detección usando configuraciones del usuario
      const SILENCE_THRESHOLD = silenceSettings.silenceThreshold;
      const SOUND_THRESHOLD = silenceSettings.soundThreshold;
      const SILENCE_DURATION = silenceSettings.silenceDuration; // Ya viene en milisegundos

      console.log('🎧 Detección de silencio configurada con configuraciones personalizadas:', {
        silenceDuration: SILENCE_DURATION / 1000 + 's',
        soundThreshold: SOUND_THRESHOLD,
        silenceThreshold: SILENCE_THRESHOLD
      });

      const checkVolume = () => {
        if (!analyser) return;

        analyser.getByteTimeDomainData(dataArray);

        // Calcular volumen promedio
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const value = Math.abs(dataArray[i] - 128);
          sum += value;
        }
        const averageVolume = sum / bufferLength;

        setState(prev => ({ ...prev, currentVolume: averageVolume }));

        // Detectar primer sonido usando ref
        if (!hasDetectedSoundRef.current && averageVolume > SOUND_THRESHOLD) {
          console.log('🔊 Primer sonido detectado! Iniciando monitoreo de silencio...');
          hasDetectedSoundRef.current = true;
          setState(prev => ({ ...prev, hasDetectedSound: true }));
        }

        // Solo monitorear silencio después del primer sonido
        if (hasDetectedSoundRef.current) {
          if (averageVolume < SILENCE_THRESHOLD) {
            // Silencio detectado
            if (silenceStartTimeRef.current === null) {
              silenceStartTimeRef.current = Date.now();
              console.log('🤫 Silencio detectado - iniciando countdown...');
            }

            const silenceElapsed = Date.now() - silenceStartTimeRef.current;
            const remainingSeconds = Math.ceil((SILENCE_DURATION - silenceElapsed) / 1000);

            setState(prev => ({
              ...prev,
              silenceCountdown: Math.max(0, remainingSeconds)
            }));

            if (silenceElapsed >= SILENCE_DURATION) {
              console.log('⏰ Auto-stop: 3 segundos de silencio - deteniendo compartición');

              // Detener todas las pistas del stream
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => {
                  track.stop();
                });
              }
              return; // Salir del loop
            }
          } else {
            // Sonido detectado - resetear contador de silencio
            if (silenceStartTimeRef.current !== null) {
              console.log('🔊 Sonido reanudado - reiniciando contador');
              silenceStartTimeRef.current = null;
              setState(prev => ({ ...prev, silenceCountdown: 0 }));
            }
          }
        }
      };

      // Iniciar monitoreo cada 100ms
      volumeCheckIntervalRef.current = setInterval(checkVolume, 100);

    } catch (error) {
      console.error('Error configurando detección de silencio:', error);
    }
  }, [silenceSettings]);

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
        clearAutoStopTimer();
        clearSilenceDetection();
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
          clearAutoStopTimer();
          clearSilenceDetection();
          stopRecording();
        }
      };

      // Iniciar grabación
      mediaRecorderRef.current.start(1000); // Chunk cada segundo
      setState(prev => ({
        ...prev,
        isRecording: true,
        duration: 0,
        hasDetectedSound: false,
        silenceCountdown: 0,
        currentVolume: 0
      }));
      startDurationTimer();

      // Configurar detección de silencio inteligente
      setupSilenceDetection(stream);

    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error desconocido al iniciar grabación',
        isRecording: false
      }));
    }
  }, [state.isRecording, startDurationTimer, stopDurationTimer, clearAutoStopTimer, setupSilenceDetection]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      // Limpiar timers y detección de silencio
      clearAutoStopTimer();
      clearSilenceDetection();

      mediaRecorderRef.current.stop();

      // Detener todas las pistas del stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
    }
  }, [state.isRecording, clearAutoStopTimer, clearSilenceDetection]);

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
