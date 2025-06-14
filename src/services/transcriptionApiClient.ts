/**
 * Cliente para la API de Transcripción Python
 */

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

export interface AudioInfo {
  duration: number;
  sample_rate: number;
  channels: number;
  format: string;
  size_mb: number;
}

export interface TranscriptionResponse {
  success: boolean;
  text: string;
  language: string;
  model_used: string;
  segments?: TranscriptionSegment[];
  audio_info: AudioInfo;
  processing_time: number;
  timestamp: string;
  config: Record<string, any>;
}

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  return_timestamps?: boolean;
  temperature?: number;
  initial_prompt?: string;
}

export interface HealthResponse {
  status: string;
  message: string;
  version: string;
  timestamp: string;
}

export interface ModelInfo {
  name: string;
  size: string;
  description: string;
  languages: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
}

export class TranscriptionApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = 'http://localhost:8000', timeout: number = 300000) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout; // 5 minutes default timeout
  }

  /**
   * Verificar que la API esté funcionando
   */
  async healthCheck(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 seconds for health check
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`API health check failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Transcribir archivo de audio
   */
  async transcribeAudio(
    audioFile: File | Blob,
    options: TranscriptionOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResponse> {
    try {
      // Validar archivo
      if (!audioFile) {
        throw new Error('No se proporcionó archivo de audio');
      }

      // Validar tamaño (25MB máximo)
      const maxSize = 25 * 1024 * 1024;
      if (audioFile.size > maxSize) {
        throw new Error(`Archivo demasiado grande. Máximo: ${maxSize / (1024 * 1024)}MB`);
      }

      // Crear FormData
      const formData = new FormData();
      
      // Agregar archivo
      if (audioFile instanceof File) {
        formData.append('file', audioFile);
      } else {
        // Si es Blob, crear File con nombre
        const file = new File([audioFile], 'audio.webm', { type: audioFile.type });
        formData.append('file', file);
      }

      // Agregar opciones
      if (options.language) {
        formData.append('language', options.language);
      }
      if (options.model) {
        formData.append('model', options.model);
      }
      if (options.return_timestamps !== undefined) {
        formData.append('return_timestamps', options.return_timestamps.toString());
      }
      if (options.temperature !== undefined) {
        formData.append('temperature', options.temperature.toString());
      }
      if (options.initial_prompt) {
        formData.append('initial_prompt', options.initial_prompt);
      }

      // Crear AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/transcribe`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.detail || 
            `Transcription failed: ${response.status} ${response.statusText}`
          );
        }

        const result: TranscriptionResponse = await response.json();
        
        // Simular progreso al 100% cuando se completa
        if (onProgress) {
          onProgress(100);
        }

        return result;

      } finally {
        clearTimeout(timeoutId);
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Transcripción cancelada por timeout');
      }
      throw new Error(`Error en transcripción: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Obtener modelos disponibles
   */
  async getAvailableModels(): Promise<{ models: ModelInfo[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Failed to get models: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Error getting models: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Obtener idiomas soportados
   */
  async getSupportedLanguages(): Promise<{ languages: LanguageInfo[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/languages`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Failed to get languages: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Error getting languages: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Verificar si la API está disponible
   */
  async isApiAvailable(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtener información de la API
   */
  async getApiInfo(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Failed to get API info: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Error getting API info: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Configurar URL base de la API
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
  }

  /**
   * Configurar timeout
   */
  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  /**
   * Obtener URL base actual
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Obtener timeout actual
   */
  getTimeout(): number {
    return this.timeout;
  }
}

// Instancia singleton del cliente
export const transcriptionApiClient = new TranscriptionApiClient();

// Función de conveniencia para transcribir
export async function transcribeAudioFile(
  audioFile: File | Blob,
  options: TranscriptionOptions = {},
  onProgress?: (progress: number) => void
): Promise<TranscriptionResponse> {
  return transcriptionApiClient.transcribeAudio(audioFile, options, onProgress);
}

// Función de conveniencia para verificar disponibilidad
export async function checkApiAvailability(): Promise<boolean> {
  return transcriptionApiClient.isApiAvailable();
}
