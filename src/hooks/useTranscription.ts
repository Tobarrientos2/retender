import React, { useState, useRef, useCallback } from 'react';
import { processAudioBlob, type AudioProcessingResult } from '../utils/audioProcessor';

export interface TranscriptionProgress {
  stage: 'loading' | 'processing' | 'complete';
  progress: number;
  message: string;
}

export interface TranscriptionResult {
  text: string;
  chunks?: Array<{
    text: string;
    timestamp: [number, number];
  }>;
  language: string;
  duration?: number;
}

export interface TranscriptionState {
  isTranscribing: boolean;
  progress: TranscriptionProgress | null;
  result: TranscriptionResult | null;
  error: string | null;
}

export interface UseTranscriptionReturn {
  state: TranscriptionState;
  transcribeAudio: (audioBlob: Blob, options?: TranscriptionOptions) => Promise<void>;
  clearTranscription: () => void;
  isWorkerReady: boolean;
}

export interface TranscriptionOptions {
  language?: string;
  returnTimestamps?: boolean;
  chunkLengthS?: number;
}

export function useTranscription(): UseTranscriptionReturn {
  const [state, setState] = useState<TranscriptionState>({
    isTranscribing: false,
    progress: null,
    result: null,
    error: null,
  });

  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  // Inicializar worker
  const initializeWorker = useCallback(() => {
    if (workerRef.current) {
      return workerRef.current;
    }

    try {
      workerRef.current = new Worker('/workers/transcription-worker.js', {
        type: 'module'
      });

      workerRef.current.onmessage = (e) => {
        const { type, id, result, error, stage, progress, message } = e.data;

        switch (type) {
          case 'ready':
            setIsWorkerReady(true);
            break;

          case 'progress':
            setState(prev => ({
              ...prev,
              progress: { stage, progress, message }
            }));
            break;

          case 'result':
            setState(prev => ({
              ...prev,
              isTranscribing: false,
              result,
              progress: {
                stage: 'complete',
                progress: 100,
                message: 'Transcripción completada'
              }
            }));
            break;

          case 'error':
            setState(prev => ({
              ...prev,
              isTranscribing: false,
              error,
              progress: null
            }));
            break;

          case 'initialized':
            console.log('Transcription worker initialized');
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        console.error('Worker error details:', {
          message: error.message,
          filename: error.filename,
          lineno: error.lineno,
          colno: error.colno,
          error: error.error
        });

        const errorMessage = error.error ?
          `Error en worker: ${error.error.message || error.error}` :
          `Error en worker: ${error.message || 'Error desconocido'}`;

        setState(prev => ({
          ...prev,
          isTranscribing: false,
          error: errorMessage
        }));
      };

      return workerRef.current;

    } catch (error) {
      console.error('Error creating worker:', error);
      setState(prev => ({
        ...prev,
        error: 'No se pudo inicializar el worker de transcripción'
      }));
      return null;
    }
  }, []);

  const transcribeAudio = useCallback(async (
    audioBlob: Blob,
    options: TranscriptionOptions = {}
  ) => {
    try {
      setState(prev => ({
        ...prev,
        isTranscribing: true,
        error: null,
        progress: {
          stage: 'loading',
          progress: 0,
          message: 'Preparando transcripción...'
        }
      }));

      const worker = initializeWorker();
      if (!worker) {
        throw new Error('No se pudo inicializar el worker');
      }

      // Procesar audio en el hilo principal (AudioContext no disponible en workers)
      setState(prev => ({
        ...prev,
        progress: {
          stage: 'loading',
          progress: 20,
          message: 'Procesando archivo de audio...'
        }
      }));

      const audioResult = await processAudioBlob(audioBlob);

      setState(prev => ({
        ...prev,
        progress: {
          stage: 'loading',
          progress: 40,
          message: 'Audio procesado, enviando al worker...'
        }
      }));

      const requestId = ++requestIdRef.current;

      // Configuración por defecto
      const transcriptionOptions = {
        language: 'auto',
        returnTimestamps: true,
        chunkLengthS: 30,
        ...options
      };

      // Enviar datos de audio ya procesados al worker
      worker.postMessage({
        type: 'transcribe',
        id: requestId,
        data: audioResult.audioData, // Float32Array en lugar de Blob
        options: transcriptionOptions
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        isTranscribing: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
    }
  }, [initializeWorker]);

  const clearTranscription = useCallback(() => {
    setState({
      isTranscribing: false,
      progress: null,
      result: null,
      error: null,
    });
  }, []);

  // Cleanup worker on unmount
  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsWorkerReady(false);
    }
  }, []);

  // Initialize worker on first use
  React.useEffect(() => {
    initializeWorker();
    return cleanup;
  }, [initializeWorker, cleanup]);

  return {
    state,
    transcribeAudio,
    clearTranscription,
    isWorkerReady,
  };
}

// Utility functions
export function formatTranscriptionTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function exportTranscriptionAsText(result: TranscriptionResult): string {
  if (!result.chunks || result.chunks.length === 0) {
    return result.text;
  }

  return result.chunks
    .map(chunk => `[${formatTranscriptionTime(chunk.timestamp[0])}] ${chunk.text}`)
    .join('\n');
}

export function exportTranscriptionAsSRT(result: TranscriptionResult): string {
  if (!result.chunks || result.chunks.length === 0) {
    return `1\n00:00:00,000 --> 00:00:10,000\n${result.text}`;
  }

  return result.chunks
    .map((chunk, index) => {
      const startTime = formatSRTTime(chunk.timestamp[0]);
      const endTime = formatSRTTime(chunk.timestamp[1]);
      return `${index + 1}\n${startTime} --> ${endTime}\n${chunk.text}\n`;
    })
    .join('\n');
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export function exportTranscriptionAsJSON(result: TranscriptionResult): string {
  return JSON.stringify(result, null, 2);
}
