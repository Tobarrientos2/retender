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
  text: string;
  language: string;
  model_used: string;
  segments: TranscriptionSegment[];
  audio_info: AudioInfo;
  processing_time: number;
  config: {
    model: string;
    language: string;
    return_timestamps: boolean;
    temperature: number;
    initial_prompt?: string;
  };
}

export interface TranscriptionError {
  error: string;
  detail: string;
  status_code: number;
}

export class TranscriptionService {
  private readonly baseUrl = 'http://localhost:9000';

  async transcribeAudio(
    audioBlob: Blob,
    options?: {
      language?: string;
      model?: string;
      return_timestamps?: boolean;
      temperature?: number;
      initial_prompt?: string;
    }
  ): Promise<TranscriptionResponse> {
    const formData = new FormData();
    
    // Agregar el archivo de audio
    formData.append('file', audioBlob, 'audio.wav');
    
    // Agregar opciones si están presentes
    if (options?.language) {
      formData.append('language', options.language);
    }
    if (options?.model) {
      formData.append('model', options.model);
    }
    if (options?.return_timestamps !== undefined) {
      formData.append('return_timestamps', options.return_timestamps.toString());
    }
    if (options?.temperature !== undefined) {
      formData.append('temperature', options.temperature.toString());
    }
    if (options?.initial_prompt) {
      formData.append('initial_prompt', options.initial_prompt);
    }

    try {
      const response = await fetch(`${this.baseUrl}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData: TranscriptionError = await response.json();
        throw new Error(`Error ${response.status}: ${errorData.detail || errorData.error}`);
      }

      const result: TranscriptionResponse = await response.json();
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error de conexión con el servicio de transcripción');
    }
  }

  async transcribeAudioSimple(audioBlob: Blob): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');

    try {
      const response = await fetch(`${this.baseUrl}/transcribe-simple`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData: TranscriptionError = await response.json();
        throw new Error(`Error ${response.status}: ${errorData.detail || errorData.error}`);
      }

      const result: TranscriptionResponse = await response.json();
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error de conexión con el servicio de transcripción');
    }
  }

  async getAvailableModels(): Promise<{ models: Array<{ name: string; size: string; description: string; languages: string }> }> {
    try {
      const response = await fetch(`${this.baseUrl}/models`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error al obtener modelos disponibles');
    }
  }

  async getSupportedLanguages(): Promise<{ languages: Array<{ code: string; name: string }> }> {
    try {
      const response = await fetch(`${this.baseUrl}/languages`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error al obtener idiomas soportados');
    }
  }

  async healthCheck(): Promise<{ status: string; message: string; version: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error al verificar el estado del servicio');
    }
  }
}

// Instancia singleton del servicio
export const transcriptionService = new TranscriptionService();