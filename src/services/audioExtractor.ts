export interface AudioExtractionProgress {
  stage: 'loading' | 'processing' | 'converting' | 'complete';
  progress: number;
  message: string;
}

export interface AudioExtractionResult {
  audioBlob: Blob;
  duration: number;
  sampleRate: number;
  channels: number;
}

export class AudioExtractor {
  private static instance: AudioExtractor;
  
  static getInstance(): AudioExtractor {
    if (!AudioExtractor.instance) {
      AudioExtractor.instance = new AudioExtractor();
    }
    return AudioExtractor.instance;
  }

  /**
   * Extrae audio de un blob de video
   */
  async extractAudioFromVideo(
    videoBlob: Blob,
    onProgress?: (progress: AudioExtractionProgress) => void
  ): Promise<AudioExtractionResult> {
    return new Promise((resolve, reject) => {
      try {
        onProgress?.({
          stage: 'loading',
          progress: 0,
          message: 'Cargando video...'
        });

        const video = document.createElement('video');
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        video.src = URL.createObjectURL(videoBlob);
        video.crossOrigin = 'anonymous';

        video.onloadedmetadata = async () => {
          try {
            onProgress?.({
              stage: 'processing',
              progress: 25,
              message: 'Procesando audio...'
            });

            const duration = video.duration;
            
            // Crear source desde el elemento video
            const source = audioContext.createMediaElementSource(video);
            const destination = audioContext.createMediaStreamDestination();
            
            // Conectar source al destination
            source.connect(destination);
            
            // También conectar al output para que se pueda reproducir
            source.connect(audioContext.destination);

            onProgress?.({
              stage: 'converting',
              progress: 50,
              message: 'Convirtiendo a audio...'
            });

            // Crear MediaRecorder para capturar el audio
            const mediaRecorder = new MediaRecorder(destination.stream, {
              mimeType: this.getSupportedAudioMimeType()
            });

            const audioChunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunks.push(event.data);
              }
            };

            mediaRecorder.onstop = () => {
              onProgress?.({
                stage: 'complete',
                progress: 100,
                message: 'Audio extraído exitosamente'
              });

              const audioBlob = new Blob(audioChunks, { 
                type: this.getSupportedAudioMimeType() 
              });

              // Limpiar recursos
              URL.revokeObjectURL(video.src);
              audioContext.close();

              resolve({
                audioBlob,
                duration,
                sampleRate: audioContext.sampleRate,
                channels: 2 // Asumimos estéreo
              });
            };

            mediaRecorder.onerror = (event) => {
              reject(new Error(`Error en MediaRecorder: ${event}`));
            };

            // Iniciar grabación y reproducción
            mediaRecorder.start();
            
            video.onended = () => {
              mediaRecorder.stop();
            };

            video.onerror = () => {
              reject(new Error('Error al reproducir el video'));
            };

            // Reproducir el video (muted para evitar audio duplicado)
            video.muted = true;
            await video.play();

            // Actualizar progreso durante la reproducción
            const progressInterval = setInterval(() => {
              if (video.currentTime > 0 && video.duration > 0) {
                const progress = 50 + (video.currentTime / video.duration) * 40;
                onProgress?.({
                  stage: 'converting',
                  progress: Math.min(progress, 90),
                  message: `Convirtiendo... ${Math.round(video.currentTime)}s / ${Math.round(video.duration)}s`
                });
              }
            }, 1000);

            video.onended = () => {
              clearInterval(progressInterval);
              mediaRecorder.stop();
            };

          } catch (error) {
            reject(error);
          }
        };

        video.onerror = () => {
          reject(new Error('Error al cargar el video'));
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Extrae audio usando Web Audio API (método alternativo más preciso)
   */
  async extractAudioWithWebAudio(
    videoBlob: Blob,
    onProgress?: (progress: AudioExtractionProgress) => void
  ): Promise<AudioExtractionResult> {
    return new Promise(async (resolve, reject) => {
      try {
        onProgress?.({
          stage: 'loading',
          progress: 0,
          message: 'Cargando archivo...'
        });

        // Convertir blob a ArrayBuffer
        const arrayBuffer = await videoBlob.arrayBuffer();
        
        onProgress?.({
          stage: 'processing',
          progress: 25,
          message: 'Decodificando audio...'
        });

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Decodificar audio del video
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        onProgress?.({
          stage: 'converting',
          progress: 75,
          message: 'Convirtiendo formato...'
        });

        // Convertir AudioBuffer a WAV
        const wavBlob = this.audioBufferToWav(audioBuffer);
        
        onProgress?.({
          stage: 'complete',
          progress: 100,
          message: 'Audio extraído exitosamente'
        });

        await audioContext.close();

        resolve({
          audioBlob: wavBlob,
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels
        });

      } catch (error) {
        reject(new Error(`Error extrayendo audio: ${error instanceof Error ? error.message : 'Error desconocido'}`));
      }
    });
  }

  /**
   * Convierte AudioBuffer a WAV Blob
   */
  private audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length * numberOfChannels * 2;
    
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    // Audio data
    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Obtiene el tipo MIME de audio soportado por el navegador
   */
  private getSupportedAudioMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }

  /**
   * Verifica si el navegador soporta extracción de audio
   */
  static isSupported(): boolean {
    return !!(
      window.AudioContext || 
      (window as any).webkitAudioContext
    ) && !!MediaRecorder;
  }

  /**
   * Obtiene información sobre las capacidades del navegador
   */
  static getCapabilities() {
    return {
      audioContext: !!(window.AudioContext || (window as any).webkitAudioContext),
      mediaRecorder: !!MediaRecorder,
      supportedAudioTypes: [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ].filter(type => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type))
    };
  }
}
