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
    return new Promise((resolve, reject) => {
      try {
        onProgress?.({
          stage: 'loading',
          progress: 0,
          message: 'Cargando archivo...'
        });

        const video = document.createElement('video');
        video.src = URL.createObjectURL(videoBlob);
        video.muted = false; // Importante: NO silenciar para poder capturar audio
        video.preload = 'metadata';

        // Primer intento: esperar a que cargue metadata
        video.onloadedmetadata = async () => {
          try {
            const duration = video.duration;
            
            console.log('Video metadata cargada:', {
              duration,
              readyState: video.readyState,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              hasAudio: video.mozHasAudio !== undefined ? video.mozHasAudio : 'unknown'
            });
            
            // Si la duración no es válida, intentar obtenerla de otra manera
            let finalDuration = duration;
            if (!isFinite(duration) || duration <= 0) {
              console.warn('Duración inválida detectada, intentando método alternativo...');
              
              // Intentar reproducir brevemente para obtener duración
              video.currentTime = 999999; // Ir al final
              await new Promise(resolve => setTimeout(resolve, 100));
              finalDuration = video.currentTime;
              video.currentTime = 0;
              
              console.log('Duración alternativa obtenida:', finalDuration);
              
              // Si aún no es válida, usar duración estimada
              if (!isFinite(finalDuration) || finalDuration <= 0) {
                console.warn('No se pudo obtener duración, usando estimación por tamaño de archivo');
                // Estimar duración basada en tamaño (muy aproximado)
                const estimatedDuration = Math.max(5, videoBlob.size / (1024 * 1024) * 2); // ~2 segundos por MB
                finalDuration = estimatedDuration;
                console.log('Duración estimada:', finalDuration);
              }
            }

            onProgress?.({
              stage: 'processing',
              progress: 25,
              message: `Procesando video (${Math.round(finalDuration)}s)...`
            });

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Crear source desde el elemento video
            const source = audioContext.createMediaElementSource(video);
            const destination = audioContext.createMediaStreamDestination();
            
            // Conectar directamente sin analyser para evitar problemas
            source.connect(destination);

            onProgress?.({
              stage: 'converting',
              progress: 50,
              message: 'Configurando captura de audio...'
            });

            // Crear MediaRecorder para capturar el audio
            const mediaRecorder = new MediaRecorder(destination.stream, {
              mimeType: this.getSupportedAudioMimeType()
            });

            const audioChunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunks.push(event.data);
                console.log('Audio chunk recibido:', event.data.size, 'bytes');
              }
            };

            mediaRecorder.onstop = () => {
              console.log('MediaRecorder detenido, chunks:', audioChunks.length);
              
              if (audioChunks.length === 0) {
                reject(new Error('No se capturó audio. Asegúrate de que el video tenga audio.'));
                return;
              }

              onProgress?.({
                stage: 'complete',
                progress: 100,
                message: 'Audio extraído exitosamente'
              });

              const audioBlob = new Blob(audioChunks, { 
                type: this.getSupportedAudioMimeType() 
              });

              console.log('Audio blob creado:', audioBlob.size, 'bytes, tipo:', audioBlob.type);

              // Limpiar recursos
              URL.revokeObjectURL(video.src);
              audioContext.close();

              resolve({
                audioBlob,
                duration: finalDuration,
                sampleRate: audioContext.sampleRate,
                channels: 2 // Asumimos estéreo por defecto
              });
            };

            mediaRecorder.onerror = (event) => {
              console.error('MediaRecorder error:', event);
              reject(new Error(`Error en MediaRecorder: ${event}`));
            };

            mediaRecorder.onstart = () => {
              console.log('MediaRecorder iniciado');
            };

            // Iniciar grabación
            mediaRecorder.start(100); // Chunks más frecuentes
            console.log('MediaRecorder.start() llamado');
            
            // Reproducir el video para capturar audio
            video.currentTime = 0;
            
            const playPromise = video.play();
            if (playPromise) {
              await playPromise;
              console.log('Video reproduciendo para captura de audio');
            }

            // Actualizar progreso durante la reproducción
            const progressInterval = setInterval(() => {
              if (video.currentTime >= 0 && isFinite(finalDuration) && finalDuration > 0) {
                const progress = 50 + (video.currentTime / finalDuration) * 40;
                onProgress?.({
                  stage: 'converting',
                  progress: Math.min(progress, 90),
                  message: `Procesando... ${Math.round(video.currentTime)}s / ${Math.round(finalDuration)}s`
                });
              }
            }, 500);

            video.onended = () => {
              console.log('Video terminó, deteniendo MediaRecorder');
              clearInterval(progressInterval);
              setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                  mediaRecorder.stop();
                }
              }, 100); // Pequeña pausa para asegurar que se capture todo
            };

            video.onerror = (e) => {
              console.error('Error en elemento video:', e);
              clearInterval(progressInterval);
              reject(new Error('Error al reproducir el video'));
            };

            // Timeout de seguridad
            setTimeout(() => {
              if (mediaRecorder.state === 'recording') {
                console.log('Timeout: forzando parada del MediaRecorder');
                clearInterval(progressInterval);
                mediaRecorder.stop();
              }
            }, (finalDuration + 5) * 1000); // Duración + 5 segundos de margen

          } catch (error) {
            console.error('Error en procesamiento de video:', error);
            reject(error);
          }
        };

        video.onerror = (e) => {
          console.error('Error cargando video:', e);
          reject(new Error('Error al cargar el video'));
        };

        // Timeout para carga del video con fallback
        const loadTimeout = setTimeout(() => {
          if (video.readyState < 1) {
            console.warn('Video tardó en cargar metadata, intentando método alternativo...');
            this.extractAudioFallback(videoBlob, onProgress)
              .then(resolve)
              .catch(reject);
          }
        }, 5000);

        // Limpiar timeout si se carga correctamente
        video.addEventListener('loadedmetadata', () => {
          clearTimeout(loadTimeout);
        }, { once: true });

      } catch (error) {
        console.error('Error general en extractAudioWithWebAudio:', error);
        reject(error);
      }
    });
  }

  /**
   * Método fallback para extraer audio cuando el método principal falla
   */
  private async extractAudioFallback(
    videoBlob: Blob,
    onProgress?: (progress: AudioExtractionProgress) => void
  ): Promise<AudioExtractionResult> {
    console.log('🔄 Usando método fallback para extracción de audio');
    
    return new Promise((resolve, reject) => {
      try {
        onProgress?.({
          stage: 'processing',
          progress: 25,
          message: 'Intentando método alternativo...'
        });

        const video = document.createElement('video');
        video.src = URL.createObjectURL(videoBlob);
        video.muted = false;
        video.controls = false;

        // No esperar metadata, forzar reproducción
        video.oncanplay = async () => {
          try {
            console.log('Video puede reproducirse, iniciando captura...');
            
            onProgress?.({
              stage: 'converting',
              progress: 50,
              message: 'Capturando audio sin metadata...'
            });

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContext.createMediaElementSource(video);
            const destination = audioContext.createMediaStreamDestination();
            
            source.connect(destination);

            const mediaRecorder = new MediaRecorder(destination.stream, {
              mimeType: this.getSupportedAudioMimeType()
            });

            const audioChunks: Blob[] = [];
            let recordingStartTime = Date.now();

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunks.push(event.data);
                console.log('Fallback: Audio chunk recibido:', event.data.size, 'bytes');
              }
            };

            mediaRecorder.onstop = () => {
              const recordingDuration = (Date.now() - recordingStartTime) / 1000;
              console.log('Fallback: Grabación completada, duración:', recordingDuration);

              if (audioChunks.length === 0) {
                reject(new Error('Método fallback: No se capturó audio'));
                return;
              }

              onProgress?.({
                stage: 'complete',
                progress: 100,
                message: 'Audio extraído con método alternativo'
              });

              const audioBlob = new Blob(audioChunks, { 
                type: this.getSupportedAudioMimeType() 
              });

              URL.revokeObjectURL(video.src);
              audioContext.close();

              resolve({
                audioBlob,
                duration: recordingDuration,
                sampleRate: audioContext.sampleRate,
                channels: 2
              });
            };

            mediaRecorder.start(100);
            await video.play();

            // Parar después de 30 segundos máximo o cuando termine
            const maxDuration = 30000; // 30 segundos máximo
            const stopTimeout = setTimeout(() => {
              if (mediaRecorder.state === 'recording') {
                console.log('Fallback: Timeout alcanzado, deteniendo...');
                mediaRecorder.stop();
              }
            }, maxDuration);

            video.onended = () => {
              clearTimeout(stopTimeout);
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
              }
            };

            video.onerror = () => {
              clearTimeout(stopTimeout);
              reject(new Error('Fallback: Error reproduciendo video'));
            };

          } catch (error) {
            reject(error);
          }
        };

        video.onerror = () => {
          reject(new Error('Fallback: Error cargando video'));
        };

        // Timeout para el fallback
        setTimeout(() => {
          reject(new Error('Fallback: Timeout en método alternativo'));
        }, 35000);

      } catch (error) {
        reject(error);
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
