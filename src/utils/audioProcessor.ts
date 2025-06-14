/**
 * Utilidades para procesar audio en el hilo principal
 * AudioContext solo está disponible en el hilo principal, no en workers
 */

export interface AudioProcessingResult {
  audioData: Float32Array;
  sampleRate: number;
  duration: number;
  channels: number;
}

/**
 * Convierte un Blob de audio a Float32Array para usar con Whisper
 * @param audioBlob - Blob de audio (WebM, MP4, WAV, etc.)
 * @returns Datos de audio procesados
 */
export async function processAudioBlob(audioBlob: Blob): Promise<AudioProcessingResult> {
  try {
    // Convertir blob a array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Crear contexto de audio
    const audioContext = new AudioContext();
    
    try {
      // Decodificar datos de audio
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convertir a Float32Array mono
      const audioData = audioBufferToFloat32Array(audioBuffer);
      
      const result: AudioProcessingResult = {
        audioData,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
        channels: audioBuffer.numberOfChannels
      };
      
      return result;
      
    } finally {
      // Cerrar contexto de audio
      await audioContext.close();
    }
    
  } catch (error) {
    throw new Error(`Error procesando audio: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Convierte AudioBuffer a Float32Array mono
 * @param audioBuffer - AudioBuffer del Web Audio API
 * @returns Float32Array con datos de audio mono
 */
function audioBufferToFloat32Array(audioBuffer: AudioBuffer): Float32Array {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  
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

/**
 * Crea un audio de prueba sintético
 * @param frequency - Frecuencia del tono (Hz)
 * @param duration - Duración en segundos
 * @param sampleRate - Tasa de muestreo (Hz)
 * @returns Datos de audio sintético
 */
export function createTestAudio(
  frequency: number = 440, 
  duration: number = 2, 
  sampleRate: number = 16000
): AudioProcessingResult {
  const length = sampleRate * duration;
  const audioData = new Float32Array(length);
  
  // Generar onda senoidal
  for (let i = 0; i < length; i++) {
    audioData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.1;
  }
  
  return {
    audioData,
    sampleRate,
    duration,
    channels: 1
  };
}

/**
 * Convierte AudioProcessingResult a Blob WAV para descarga
 * @param result - Resultado del procesamiento de audio
 * @returns Blob WAV
 */
export function audioDataToWavBlob(result: AudioProcessingResult): Blob {
  const { audioData, sampleRate } = result;
  const length = audioData.length;
  const arrayBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(arrayBuffer);
  
  // Función auxiliar para escribir strings
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  // WAV header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);
  
  // Convert float samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(offset, sample * 0x7FFF, true);
    offset += 2;
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Valida que los datos de audio sean válidos para Whisper
 * @param audioData - Datos de audio a validar
 * @returns true si son válidos
 */
export function validateAudioData(audioData: Float32Array): boolean {
  if (!audioData || audioData.length === 0) {
    return false;
  }
  
  // Verificar que no todos los valores sean cero
  const hasNonZeroValues = audioData.some(value => Math.abs(value) > 0.001);
  
  return hasNonZeroValues;
}

/**
 * Obtiene información sobre los datos de audio
 * @param result - Resultado del procesamiento de audio
 * @returns Información legible sobre el audio
 */
export function getAudioInfo(result: AudioProcessingResult): string {
  const { audioData, sampleRate, duration, channels } = result;
  const size = (audioData.length * 4 / 1024).toFixed(1); // KB
  const maxAmplitude = Math.max(...Array.from(audioData).map(Math.abs));
  
  return `Duración: ${duration.toFixed(2)}s, Canales: ${channels}, Sample Rate: ${sampleRate}Hz, Tamaño: ${size}KB, Amplitud máx: ${maxAmplitude.toFixed(3)}`;
}
