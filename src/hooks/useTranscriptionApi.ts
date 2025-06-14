/**
 * Hook para usar la API de Transcripción Python
 */

import { useState, useCallback, useRef } from 'react';
import { 
  transcriptionApiClient, 
  type TranscriptionResponse, 
  type TranscriptionOptions,
  type HealthResponse,
  type ModelInfo,
  type LanguageInfo
} from '../services/transcriptionApiClient';

export interface TranscriptionState {
  isTranscribing: boolean;
  isApiAvailable: boolean;
  progress: number;
  result: TranscriptionResponse | null;
  error: string | null;
  apiInfo: HealthResponse | null;
}

export interface UseTranscriptionApiReturn {
  state: TranscriptionState;
  transcribeAudio: (audioFile: File | Blob, options?: TranscriptionOptions) => Promise<void>;
  checkApiHealth: () => Promise<void>;
  getAvailableModels: () => Promise<ModelInfo[]>;
  getSupportedLanguages: () => Promise<LanguageInfo[]>;
  clearResult: () => void;
  clearError: () => void;
  setApiUrl: (url: string) => void;
}

export function useTranscriptionApi(): UseTranscriptionApiReturn {
  const [state, setState] = useState<TranscriptionState>({
    isTranscribing: false,
    isApiAvailable: false,
    progress: 0,
    result: null,
    error: null,
    apiInfo: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const checkApiHealth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const health = await transcriptionApiClient.healthCheck();
      const apiInfo = await transcriptionApiClient.getApiInfo();
      
      setState(prev => ({
        ...prev,
        isApiAvailable: true,
        apiInfo,
        error: null
      }));
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        isApiAvailable: false,
        apiInfo: null,
        error: `API no disponible: ${error instanceof Error ? error.message : error}`
      }));
    }
  }, []);

  const transcribeAudio = useCallback(async (
    audioFile: File | Blob, 
    options: TranscriptionOptions = {}
  ) => {
    try {
      // Cancelar transcripción anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setState(prev => ({
        ...prev,
        isTranscribing: true,
        progress: 0,
        error: null,
        result: null
      }));

      // Verificar que la API esté disponible
      const isAvailable = await transcriptionApiClient.isApiAvailable();
      if (!isAvailable) {
        throw new Error('API de transcripción no está disponible');
      }

      // Configurar progreso
      const onProgress = (progress: number) => {
        setState(prev => ({ ...prev, progress }));
      };

      // Simular progreso inicial
      onProgress(10);

      // Transcribir
      const result = await transcriptionApiClient.transcribeAudio(
        audioFile, 
        options, 
        onProgress
      );

      setState(prev => ({
        ...prev,
        isTranscribing: false,
        progress: 100,
        result,
        error: null
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isTranscribing: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Error desconocido en transcripción'
      }));
    }
  }, []);

  const getAvailableModels = useCallback(async (): Promise<ModelInfo[]> => {
    try {
      const response = await transcriptionApiClient.getAvailableModels();
      return response.models;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Error obteniendo modelos: ${error instanceof Error ? error.message : error}`
      }));
      return [];
    }
  }, []);

  const getSupportedLanguages = useCallback(async (): Promise<LanguageInfo[]> => {
    try {
      const response = await transcriptionApiClient.getSupportedLanguages();
      return response.languages;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Error obteniendo idiomas: ${error instanceof Error ? error.message : error}`
      }));
      return [];
    }
  }, []);

  const clearResult = useCallback(() => {
    setState(prev => ({
      ...prev,
      result: null,
      progress: 0
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  const setApiUrl = useCallback((url: string) => {
    transcriptionApiClient.setBaseUrl(url);
    // Re-verificar salud de la API con nueva URL
    checkApiHealth();
  }, [checkApiHealth]);

  return {
    state,
    transcribeAudio,
    checkApiHealth,
    getAvailableModels,
    getSupportedLanguages,
    clearResult,
    clearError,
    setApiUrl,
  };
}

// Hook simplificado para casos básicos
export function useSimpleTranscription() {
  const { state, transcribeAudio, clearResult, clearError } = useTranscriptionApi();

  const transcribe = useCallback(async (audioFile: File | Blob, language?: string) => {
    await transcribeAudio(audioFile, { 
      language: language || 'auto',
      model: 'base',
      return_timestamps: true 
    });
  }, [transcribeAudio]);

  return {
    isTranscribing: state.isTranscribing,
    progress: state.progress,
    result: state.result,
    error: state.error,
    transcribe,
    clearResult,
    clearError,
  };
}
