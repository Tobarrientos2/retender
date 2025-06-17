import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { TranscriptionResponse } from '../services/transcriptionService';

export interface PersistentTranscriptionState {
  activeJobs: any[];
  completedJobs: any[];
  isLoading: boolean;
  error: string | null;
}

export interface PersistentTranscriptionOptions {
  apiBaseUrl?: string;
  onJobComplete?: (jobId: string, result: TranscriptionResponse) => void;
  onJobError?: (jobId: string, error: string) => void;
  onJobProgress?: (jobId: string, progress: number, message: string) => void;
}

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  return_timestamps?: boolean;
  temperature?: number;
  initial_prompt?: string;
}

/**
 * Hook para manejar transcripciones persistentes que continúan en background
 * incluso cuando el usuario navega a otras partes de la aplicación
 */
export function usePersistentTranscription(options: PersistentTranscriptionOptions = {}) {
  const {
    apiBaseUrl = 'http://localhost:8001',
    onJobComplete,
    onJobError,
    onJobProgress
  } = options;

  const [state, setState] = useState<PersistentTranscriptionState>({
    activeJobs: [],
    completedJobs: [],
    isLoading: false,
    error: null
  });

  // Mutations de Convex
  const createJob = useMutation(api.transcriptionJobs.createTranscriptionJob);
  const cancelJob = useMutation(api.transcriptionJobs.cancelTranscriptionJob);

  // Queries de Convex
  const activeJobs = useQuery(api.transcriptionJobs.getActiveTranscriptionJobs);
  const allJobs = useQuery(api.transcriptionJobs.getUserTranscriptionJobs);
  const stats = useQuery(api.transcriptionJobs.getTranscriptionStats);

  // Referencia para tracking de jobs
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Manejar resultados de polling
  const handleJobResult = useCallback((jobId: string, jobData: any) => {
    console.log(`📊 Resultado del job ${jobId}:`, jobData);

    if (jobData.status === 'completed' && jobData.result) {
      console.log(`✅ Job completado via polling: ${jobId}`);
      onJobComplete?.(jobId, jobData.result);
    } else if (jobData.status === 'failed' && jobData.error) {
      console.log(`❌ Job falló via polling: ${jobId}`);
      onJobError?.(jobId, jobData.error);
    } else if (jobData.progress !== undefined) {
      onJobProgress?.(jobId, jobData.progress, jobData.message || '');
    }
  }, [onJobComplete, onJobError, onJobProgress]);

  // Actualizar estado cuando cambien los jobs
  useEffect(() => {
    if (activeJobs && allJobs) {
      const completed = allJobs.filter(job =>
        job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'
      );

      setState(prev => ({
        ...prev,
        activeJobs: activeJobs,
        completedJobs: completed,
        isLoading: false
      }));
    }
  }, [activeJobs, allJobs]);

  // Polling para verificar el estado de jobs activos
  useEffect(() => {
    if (!activeJobs || activeJobs.length === 0) return;

    console.log(`🔄 Iniciando polling para ${activeJobs.length} jobs activos`);

    const pollJobStatus = async (jobId: string) => {
      try {
        const response = await fetch(`${apiBaseUrl}/job/${jobId}`);
        if (response.ok) {
          const jobStatus = await response.json();
          console.log(`📊 Estado del job ${jobId}:`, jobStatus);

          handleJobResult(jobId, jobStatus);
        } else {
          console.error(`Error obteniendo estado del job ${jobId}: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error verificando estado del job ${jobId}:`, error);
      }
    };

    // Polling cada 2 segundos para jobs activos
    const pollInterval = setInterval(() => {
      activeJobs.forEach(job => {
        if (job.status === 'pending' || job.status === 'processing') {
          pollJobStatus(job.jobId);
        }
      });
    }, 2000);

    // Verificar inmediatamente al montar
    activeJobs.forEach(job => {
      pollJobStatus(job.jobId);
    });

    return () => {
      console.log(`🛑 Deteniendo polling para jobs`);
      clearInterval(pollInterval);
    };
  }, [activeJobs, apiBaseUrl, handleJobResult]);

  // Iniciar nueva transcripción
  const startTranscription = useCallback(async (
    file: File,
    transcriptionOptions: TranscriptionOptions = {}
  ): Promise<string> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Preparar FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', transcriptionOptions.language || 'auto');
      formData.append('model', transcriptionOptions.model || 'whisper-large-v3-turbo');
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
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      const jobResponse = await response.json();

      // Crear job en Convex
      await createJob({
        jobId: jobResponse.job_id,
        fileName: file.name,
        fileSize: file.size
      });

      console.log(`✅ Job persistente creado: ${jobResponse.job_id}`);
      
      setState(prev => ({ ...prev, isLoading: false }));
      return jobResponse.job_id;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [apiBaseUrl, createJob]);

  // Cancelar transcripción
  const cancelTranscription = useCallback(async (jobId: string) => {
    try {
      // Cancelar en el backend
      await fetch(`${apiBaseUrl}/job/${jobId}`, {
        method: 'DELETE'
      });

      // Cancelar en Convex
      await cancelJob({ jobId });

      // Desconectar WebSocket
      const webSocket = webSocketConnections.current.get(jobId);
      if (webSocket) {
        webSocket.disconnect();
        webSocketConnections.current.delete(jobId);
      }

      console.log(`❌ Job cancelado: ${jobId}`);

    } catch (error) {
      console.error(`Error cancelando job ${jobId}:`, error);
      throw error;
    }
  }, [apiBaseUrl, cancelJob]);

  // Obtener job específico
  const getJobById = useCallback((jobId: string) => {
    if (!allJobs) return null;
    return allJobs.find(job => job.jobId === jobId) || null;
  }, [allJobs]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      // Limpiar todos los intervalos de polling al desmontar
      for (const interval of pollingIntervals.current.values()) {
        clearInterval(interval);
      }
      pollingIntervals.current.clear();
      console.log(`🧹 Limpieza completa de polling intervals`);
    };
  }, []);

  return {
    // Estado
    state,
    stats,
    
    // Acciones
    startTranscription,
    cancelTranscription,
    getJobById,
    
    // Datos
    activeJobs: state.activeJobs,
    completedJobs: state.completedJobs,
    allJobs: allJobs || [],
    
    // Utilidades
    hasActiveJobs: state.activeJobs.length > 0,
    isLoading: state.isLoading,
    error: state.error
  };
}
