/**
 * Hook para transcripción en background con WebSocket
 * Integra con el sistema existente manteniendo compatibilidad
 */

import { useState, useCallback, useRef } from 'react';
import { useWebSocket, type WebSocketMessage } from './useWebSocket';
import type { TranscriptionResponse } from '../services/transcriptionService';

export interface JobSubmissionResponse {
  job_id: string;
  status: string;
  websocket_url: string;
  estimated_processing_time?: number;
  queue_position?: number;
}

export interface TranscriptionJob {
  job_id: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  result?: TranscriptionResponse;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_time_remaining?: number;
}

export interface BackgroundTranscriptionState {
  isTranscribing: boolean;
  isSubmitting: boolean;
  currentJob: TranscriptionJob | null;
  progress: number;
  message: string;
  result: TranscriptionResponse | null;
  error: string | null;
  queuePosition?: number;
  estimatedTime?: number;
}

export interface UseBackgroundTranscriptionOptions {
  apiBaseUrl?: string;
  onProgress?: (progress: number, message: string) => void;
  onComplete?: (result: TranscriptionResponse) => void;
  onError?: (error: string) => void;
}

export interface UseBackgroundTranscriptionReturn {
  state: BackgroundTranscriptionState;
  transcribe: (file: File, options?: TranscriptionOptions) => Promise<void>;
  cancelJob: () => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
  isConnected: boolean;
}

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  return_timestamps?: boolean;
  temperature?: number;
  initial_prompt?: string;
}

export function useBackgroundTranscription(
  options: UseBackgroundTranscriptionOptions = {}
): UseBackgroundTranscriptionReturn {
  
  const {
    apiBaseUrl = 'http://localhost:9001', // Usar puerto 9001 por defecto
    onProgress,
    onComplete,
    onError
  } = options;

  const [state, setState] = useState<BackgroundTranscriptionState>({
    isTranscribing: false,
    isSubmitting: false,
    currentJob: null,
    progress: 0,
    message: '',
    result: null,
    error: null
  });

  const currentJobIdRef = useRef<string | null>(null);

  // WebSocket para progreso en tiempo real
  const webSocket = useWebSocket({
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      console.log('🔌 WebSocket conectado para transcripción');
    },
    onDisconnect: () => {
      console.log('🔌 WebSocket desconectado');
    },
    onError: (error) => {
      console.error('❌ Error WebSocket:', error);
      setState(prev => ({ ...prev, error }));
      onError?.(error);
    }
  });

  function handleWebSocketMessage(message: WebSocketMessage) {
    const { type, data } = message;

    switch (type) {
      case 'connected':
        console.log('✅ WebSocket conectado exitosamente');
        break;

      case 'progress':
        const progressData = data;
        setState(prev => ({
          ...prev,
          progress: progressData.progress || 0,
          message: progressData.message || '',
          currentJob: prev.currentJob ? {
            ...prev.currentJob,
            status: progressData.status,
            progress: progressData.progress || 0,
            message: progressData.message || '',
            estimated_time_remaining: progressData.estimated_time_remaining
          } : null
        }));
        
        onProgress?.(progressData.progress || 0, progressData.message || '');
        break;

      case 'completed':
        const completedData = data;
        const result = completedData.result;
        
        setState(prev => ({
          ...prev,
          isTranscribing: false,
          progress: 100,
          message: 'Transcripción completada',
          result: result,
          currentJob: prev.currentJob ? {
            ...prev.currentJob,
            status: 'completed',
            progress: 100,
            message: 'Transcripción completada',
            result: result,
            completed_at: completedData.completed_at
          } : null
        }));

        // Desconectar WebSocket
        webSocket.disconnect();
        currentJobIdRef.current = null;

        if (result) {
          onComplete?.(result);
        }
        break;

      case 'error':
        const errorData = data;
        const errorMessage = errorData.error || 'Error en transcripción';
        
        setState(prev => ({
          ...prev,
          isTranscribing: false,
          error: errorMessage,
          currentJob: prev.currentJob ? {
            ...prev.currentJob,
            status: 'failed',
            error: errorMessage,
            completed_at: errorData.completed_at
          } : null
        }));

        // Desconectar WebSocket
        webSocket.disconnect();
        currentJobIdRef.current = null;

        onError?.(errorMessage);
        break;

      case 'status':
        // Respuesta a solicitud de estado
        const statusData = data;
        setState(prev => ({
          ...prev,
          progress: statusData.progress || 0,
          message: statusData.message || '',
          currentJob: prev.currentJob ? {
            ...prev.currentJob,
            ...statusData
          } : null
        }));
        break;

      case 'pong':
        // Respuesta a ping - mantener conexión viva
        break;

      default:
        console.log('📨 Mensaje WebSocket no reconocido:', type);
    }
  }

  const transcribe = useCallback(async (
    file: File, 
    transcriptionOptions: TranscriptionOptions = {}
  ) => {
    try {
      // Limpiar estado anterior
      setState(prev => ({
        ...prev,
        isSubmitting: true,
        isTranscribing: false,
        error: null,
        result: null,
        progress: 0,
        message: 'Enviando archivo...',
        currentJob: null
      }));

      // Preparar FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', transcriptionOptions.language || 'auto');
      formData.append('model', transcriptionOptions.model || 'medium');
      formData.append('return_timestamps', (transcriptionOptions.return_timestamps ?? true).toString());
      formData.append('temperature', (transcriptionOptions.temperature ?? 0.0).toString());
      
      if (transcriptionOptions.initial_prompt) {
        formData.append('initial_prompt', transcriptionOptions.initial_prompt);
      }

      // Enviar job al backend
      const response = await fetch(`${apiBaseUrl}/transcribe-job`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
      }

      const jobResponse: JobSubmissionResponse = await response.json();
      
      // Actualizar estado con job info
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isTranscribing: true,
        message: 'Job enviado, conectando...',
        queuePosition: jobResponse.queue_position,
        estimatedTime: jobResponse.estimated_processing_time,
        currentJob: {
          job_id: jobResponse.job_id,
          status: jobResponse.status as any,
          progress: 0,
          message: 'Job en cola',
          created_at: new Date().toISOString()
        }
      }));

      // Guardar job ID
      currentJobIdRef.current = jobResponse.job_id;

      // Conectar WebSocket para seguir progreso
      const wsUrl = jobResponse.websocket_url.replace('localhost:9000', 'localhost:9001'); // Ajustar puerto
      webSocket.connect(wsUrl);

      console.log(`✅ Job enviado: ${jobResponse.job_id}`);
      console.log(`🔌 Conectando WebSocket: ${wsUrl}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isTranscribing: false,
        error: errorMessage
      }));

      onError?.(errorMessage);
      console.error('❌ Error en transcripción:', error);
    }
  }, [apiBaseUrl, webSocket, onProgress, onComplete, onError]);

  const cancelJob = useCallback(async () => {
    if (!currentJobIdRef.current) return;

    try {
      const response = await fetch(`${apiBaseUrl}/job/${currentJobIdRef.current}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setState(prev => ({
          ...prev,
          isTranscribing: false,
          message: 'Job cancelado',
          currentJob: prev.currentJob ? {
            ...prev.currentJob,
            status: 'cancelled',
            message: 'Job cancelado'
          } : null
        }));

        webSocket.disconnect();
        currentJobIdRef.current = null;
      }
    } catch (error) {
      console.error('❌ Error cancelando job:', error);
    }
  }, [apiBaseUrl, webSocket]);

  const clearResult = useCallback(() => {
    setState(prev => ({
      ...prev,
      result: null,
      progress: 0,
      message: ''
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    transcribe,
    cancelJob,
    clearResult,
    clearError,
    isConnected: webSocket.isReady
  };
}
