// transcription-worker.js
// Web Worker para transcripción con Transformers.js + Whisper v3.x

// Función para cargar Transformers.js desde CDN
async function loadTransformers() {
  try {
    // Intentar cargar desde unpkg (más confiable que jsdelivr)
    const module = await import('https://unpkg.com/@huggingface/transformers@3.5.2/dist/transformers.min.js');
    return module;
  } catch (error) {
    console.warn('Failed to load from unpkg, trying esm.sh:', error);
    try {
      // Fallback a esm.sh
      const module = await import('https://esm.sh/@huggingface/transformers@3.5.2');
      return module;
    } catch (error2) {
      console.warn('Failed to load from esm.sh, trying skypack:', error2);
      try {
        // Fallback a skypack
        const module = await import('https://cdn.skypack.dev/@huggingface/transformers@3.5.2');
        return module;
      } catch (error3) {
        throw new Error(`Failed to load Transformers.js from all CDNs: ${error3.message}`);
      }
    }
  }
}

// Variable global para el módulo transformers
let Transformers = null;

class TranscriptionWorker {
  constructor() {
    this.transcriber = null;
    this.isLoading = false;
  }

  async initializeTranscriber() {
    if (this.transcriber || this.isLoading) {
      return this.transcriber;
    }

    this.isLoading = true;

    try {
      // Cargar Transformers.js si no está disponible
      if (!Transformers) {
        self.postMessage({
          type: 'progress',
          stage: 'loading',
          progress: 10,
          message: 'Cargando librería Transformers.js...'
        });

        Transformers = await loadTransformers();

        self.postMessage({
          type: 'progress',
          stage: 'loading',
          progress: 30,
          message: 'Transformers.js cargado exitosamente'
        });
      }

      // Enviar progreso de carga del modelo
      self.postMessage({
        type: 'progress',
        stage: 'loading',
        progress: 50,
        message: 'Cargando modelo Whisper...'
      });

      // Crear pipeline de transcripción con nueva API v3.x
      this.transcriber = await Transformers.pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-base', // Modelo optimizado para v3.x
        {
          dtype: 'fp16',    // Usar precisión reducida para mejor rendimiento
          device: 'wasm',   // Usar WASM como fallback seguro
        }
      );

      self.postMessage({
        type: 'progress',
        stage: 'loading',
        progress: 100,
        message: 'Modelo cargado exitosamente'
      });

      this.isLoading = false;
      return this.transcriber;

    } catch (error) {
      this.isLoading = false;
      self.postMessage({
        type: 'error',
        error: `Error cargando modelo: ${error.message}`
      });
      throw error;
    }
  }

  async transcribeAudio(audioData, options = {}) {
    try {
      // Inicializar transcriber si no existe
      if (!this.transcriber) {
        await this.initializeTranscriber();
      }

      self.postMessage({
        type: 'progress',
        stage: 'processing',
        progress: 0,
        message: 'Iniciando transcripción...'
      });

      // Configuración por defecto para v3.x
      const config = {
        language: options.language === 'auto' ? null : options.language,
        return_timestamps: true,
        chunk_length_s: 30, // Procesar en chunks de 30 segundos
        stride_length_s: 5, // Overlap de 5 segundos entre chunks
        ...options
      };

      // Transcribir audio con nueva API v3.x
      const result = await this.transcriber(audioData, config);

      self.postMessage({
        type: 'progress',
        stage: 'processing',
        progress: 100,
        message: 'Transcripción completada'
      });

      return result;

    } catch (error) {
      throw new Error(`Error en transcripción: ${error.message}`);
    }
  }

  async processAudioFile(audioData, options = {}) {
    try {
      // El audio ya viene procesado desde el hilo principal
      // audioData debe ser un Float32Array
      if (!(audioData instanceof Float32Array)) {
        throw new Error('audioData debe ser un Float32Array');
      }

      // Transcribir directamente
      const result = await this.transcribeAudio(audioData, options);

      return result;

    } catch (error) {
      throw new Error(`Error procesando datos de audio: ${error.message}`);
    }
  }

  audioBufferToFloat32Array(audioBuffer) {
    // Convertir AudioBuffer a Float32Array mono
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    
    // Si es estéreo, mezclar a mono
    if (numberOfChannels === 2) {
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      const mono = new Float32Array(length);
      
      for (let i = 0; i < length; i++) {
        mono[i] = (left[i] + right[i]) / 2;
      }
      
      return mono;
    } else {
      // Ya es mono
      return audioBuffer.getChannelData(0);
    }
  }
}

// Instancia global del worker
const worker = new TranscriptionWorker();

// Manejar mensajes del hilo principal
self.onmessage = async function(e) {
  const { type, data, options, id } = e.data;

  try {
    switch (type) {
      case 'transcribe':
        self.postMessage({
          type: 'progress',
          id,
          stage: 'processing',
          progress: 0,
          message: 'Iniciando transcripción...'
        });

        const result = await worker.processAudioFile(data, options);
        
        self.postMessage({
          type: 'result',
          id,
          result: {
            text: result.text,
            chunks: result.chunks || [],
            language: options.language || 'auto'
          }
        });
        break;

      case 'initialize':
        await worker.initializeTranscriber();
        self.postMessage({
          type: 'initialized',
          id
        });
        break;

      default:
        throw new Error(`Tipo de mensaje desconocido: ${type}`);
    }

  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error.message
    });
  }
};

// Manejar errores no capturados
self.onerror = function(error) {
  self.postMessage({
    type: 'error',
    error: `Error en worker: ${error.message}`
  });
};

// Notificar que el worker está listo
self.postMessage({
  type: 'ready',
  message: 'Transcription worker inicializado'
});
