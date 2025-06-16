import React, { useState } from 'react';
import { useScreenRecorder, formatDuration, getRecordingInfo } from '../hooks/useScreenRecorder';
import { AudioExtractor, AudioExtractionProgress } from '../services/audioExtractor';
import { toast } from 'sonner';

interface ScreenRecorderProps {
  onRecordingComplete?: (videoBlob: Blob, audioBlob: Blob, audioInfo?: {duration: number, channels: number, sampleRate: number}) => void;
  onError?: (error: string) => void;
}

export function ScreenRecorder({ onRecordingComplete, onError }: ScreenRecorderProps) {
  const { state, startRecording, stopRecording, pauseRecording, resumeRecording, clearRecording } = useScreenRecorder();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<AudioExtractionProgress | null>(null);

  const handleStartRecording = async () => {
    try {
      await startRecording();
      toast.success('Grabación iniciada');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al iniciar grabación';
      toast.error(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    toast.success('Grabación detenida');
  };

  const handleExtractAudio = async () => {
    if (!state.recordedBlob) return;

    setIsExtracting(true);
    setExtractionProgress(null);

    try {
      const audioExtractor = AudioExtractor.getInstance();
      
      // Usar el método más confiable con Web Audio API
      const result = await audioExtractor.extractAudioWithWebAudio(
        state.recordedBlob,
        (progress) => {
          setExtractionProgress(progress);
        }
      );

      toast.success(`Audio extraído: ${result.duration.toFixed(1)}s, ${result.channels} canales, ${result.sampleRate}Hz`);
      onRecordingComplete?.(state.recordedBlob, result.audioBlob, {
        duration: result.duration,
        channels: result.channels,
        sampleRate: result.sampleRate
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al extraer audio';
      toast.error(errorMessage);
      onError?.(errorMessage);
      console.error('Audio extraction error:', error);
    } finally {
      setIsExtracting(false);
      setExtractionProgress(null);
    }
  };

  const handleClearRecording = () => {
    clearRecording();
    toast.info('Grabación eliminada');
  };

  const recordingInfo = state.recordedBlob ? getRecordingInfo(state.recordedBlob) : null;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          📹 Grabación de Pantalla
        </h2>
        <p className="text-gray-600">
          Graba tu pantalla con audio del sistema para transcripción
        </p>
      </div>

      {/* Status Display */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Estado:</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            state.isRecording 
              ? state.isPaused 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-red-100 text-red-800'
              : state.recordedBlob 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
          }`}>
            {state.isRecording 
              ? state.isPaused 
                ? '⏸️ Pausado' 
                : '🔴 Grabando'
              : state.recordedBlob 
                ? '✅ Completado' 
                : '⭕ Listo'
            }
          </span>
        </div>
        
        {state.isRecording && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Duración:</span>
              <span className="text-lg font-mono text-red-600">
                {formatDuration(state.duration)}
              </span>
            </div>

            {/* Indicador de detección de sonido */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Estado:</span>
              <span className={`text-sm font-medium ${state.hasDetectedSound ? 'text-green-600' : 'text-yellow-600'}`}>
                {state.hasDetectedSound ? '🔊 Monitoreando silencio' : '👂 Esperando primer sonido'}
              </span>
            </div>

            {/* Contador de silencio */}
            {state.hasDetectedSound && state.silenceCountdown > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Silencio:</span>
                <span className="text-sm font-mono text-orange-600">
                  🤫 Se detendrá en {state.silenceCountdown}s
                </span>
              </div>
            )}

            {/* Indicador de volumen */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Volumen:</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-100"
                    style={{ width: `${Math.min(100, (state.currentVolume / 100) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {Math.round(state.currentVolume)}
                </span>
              </div>
            </div>
          </div>
        )}

        {recordingInfo && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Tamaño:</span>
              <span className="text-sm text-gray-600">{recordingInfo.size}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Formato:</span>
              <span className="text-sm text-gray-600">{recordingInfo.type}</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">❌ {state.error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-4">
        {!state.isRecording && !state.recordedBlob && (
          <button
            onClick={handleStartRecording}
            className="w-full px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            🔴 Iniciar Grabación
          </button>
        )}

        {state.isRecording && (
          <div className="flex space-x-3">
            {!state.isPaused ? (
              <button
                onClick={pauseRecording}
                className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
              >
                ⏸️ Pausar
              </button>
            ) : (
              <button
                onClick={resumeRecording}
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                ▶️ Reanudar
              </button>
            )}
            
            <button
              onClick={handleStopRecording}
              className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              ⏹️ Detener
            </button>
          </div>
        )}

        {state.recordedBlob && !isExtracting && (
          <div className="space-y-3">
            <button
              onClick={handleExtractAudio}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              🎵 Extraer Audio para Transcripción
            </button>
            
            <div className="flex space-x-3">
              <a
                href={recordingInfo?.url}
                download={`grabacion-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-center font-medium"
              >
                💾 Descargar Video
              </a>
              
              <button
                onClick={handleClearRecording}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                🗑️ Limpiar
              </button>
            </div>
          </div>
        )}

        {/* Extraction Progress */}
        {isExtracting && extractionProgress && (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {extractionProgress.message}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${extractionProgress.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round(extractionProgress.progress)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Browser Compatibility Info */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-700 text-xs">
          💡 <strong>Tip:</strong> Para capturar audio del sistema, asegúrate de seleccionar 
          "Compartir audio" en el diálogo de grabación de pantalla.
        </p>
      </div>

      {/* Requirements */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        Requiere HTTPS • Compatible con Chrome 72+, Firefox 66+, Safari 13+
      </div>
    </div>
  );
}
