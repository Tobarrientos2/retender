import React, { useState, useRef, useEffect } from 'react';
import { ScreenRecorder } from './ScreenRecorder';
import { toast } from 'sonner';
import { transcriptionService, TranscriptionResponse } from '../services/transcriptionService';

interface RecordScreenProps {
  onBack: () => void;
}

export function RecordScreen({ onBack }: RecordScreenProps) {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioInfo, setAudioInfo] = useState<{duration: number, channels: number, sampleRate: number} | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResponse | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Configurar el audio cuando cambie el audioBlob
  useEffect(() => {
    if (audioRef.current && audioBlob) {
      // Limpiar URL anterior si existe
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      
      // Configurar nueva URL
      audioRef.current.src = URL.createObjectURL(audioBlob);
      audioRef.current.load(); // Recargar el elemento audio
      
      console.log('Audio configurado:', {
        size: audioBlob.size,
        type: audioBlob.type,
        src: audioRef.current.src
      });
    }
    
    // Cleanup
    return () => {
      if (audioRef.current?.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, [audioBlob]);

  const handleRecordingComplete = (video: Blob, audio: Blob, info?: {duration: number, channels: number, sampleRate: number}) => {
    console.log('Audio extraído:', {
      videoSize: video.size,
      audioSize: audio.size,
      audioType: audio.type,
      info
    });
    
    setVideoBlob(video);
    setAudioBlob(audio);
    setAudioInfo(info || null);
    toast.success('Audio extraído exitosamente');
  };

  const handlePlayAudio = async () => {
    if (audioRef.current && audioBlob) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          console.log('Intentando reproducir audio...');
          await audioRef.current.play();
          setIsPlaying(true);
          console.log('Audio reproduciendo correctamente');
        }
      } catch (error) {
        console.error('Error playing audio:', error);
        toast.error('Error al reproducir el audio');
        setIsPlaying(false);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleDownloadAudio = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio-extraido-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Audio descargado');
    }
  };

  const handleTranscribeAudio = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    setTranscription(null);

    try {
      console.log('Iniciando transcripción...');
      const result = await transcriptionService.transcribeAudioSimple(audioBlob);
      
      console.log('Transcripción completada:', result);
      setTranscription(result);
      toast.success(`Transcripción completada en ${result.processing_time.toFixed(2)}s`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al transcribir audio';
      console.error('Error en transcripción:', error);
      toast.error(errorMessage);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleClearAll = () => {
    setAudioBlob(null);
    setVideoBlob(null);
    setAudioInfo(null);
    setTranscription(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    toast.info('Todo limpiado');
  };

  const handleError = (error: string) => {
    toast.error(`Error: ${error}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light text-gray-900 mb-2">
            Record Screen
          </h1>
          <p className="text-gray-600">
            Graba tu pantalla y escucha el audio extraído
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Volver
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Screen Recorder Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-medium text-gray-900">
            🎬 Grabación de Pantalla
          </h2>
          <ScreenRecorder
            onRecordingComplete={handleRecordingComplete}
            onError={handleError}
          />
        </div>

        {/* Audio Player Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-medium text-gray-900">
            🎵 Reproductor de Audio
          </h2>
          
          <div className="p-6 bg-white rounded-lg shadow-lg border">
            {audioBlob ? (
              <div className="space-y-4">
                {/* Audio Element */}
                <audio
                  ref={audioRef}
                  onEnded={handleAudioEnded}
                  onError={(e) => {
                    console.error('Audio element error:', e);
                    toast.error('Error en el elemento de audio');
                    setIsPlaying(false);
                  }}
                  className="hidden"
                  preload="metadata"
                />

                {/* Audio Info */}
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🎵</span>
                  </div>
                  <h3 className="font-medium text-gray-900">Audio Extraído</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Tamaño: {(audioBlob.size / 1024 / 1024).toFixed(2)} MB</p>
                    {audioInfo && (
                      <>
                        <p>Duración: {audioInfo.duration.toFixed(1)}s</p>
                        <p>Canales: {audioInfo.channels}</p>
                        <p>Frecuencia: {audioInfo.sampleRate}Hz</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="space-y-3">
                  <button
                    onClick={handlePlayAudio}
                    className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                      isPlaying
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {isPlaying ? '⏸️ Pausar' : '▶️ Reproducir'}
                  </button>

                  <button
                    onClick={handleTranscribeAudio}
                    disabled={isTranscribing}
                    className={`w-full px-4 py-3 rounded-lg transition-colors mb-3 ${
                      isTranscribing
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                    }`}
                  >
                    {isTranscribing ? (
                      <>
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                        Transcribiendo...
                      </>
                    ) : (
                      '🎯 Transcribir Audio'
                    )}
                  </button>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleDownloadAudio}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      💾 Descargar
                    </button>
                    
                    <button
                      onClick={handleClearAll}
                      className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      🗑️ Limpiar
                    </button>
                  </div>
                </div>

                {/* Audio Waveform Visualization */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center space-x-1">
                    {Array.from({ length: 20 }).map((_, i) => {
                      const heights = ['h-2', 'h-3', 'h-4', 'h-5', 'h-6', 'h-7', 'h-8'];
                      const randomHeight = heights[Math.floor(Math.random() * heights.length)];
                      return (
                        <div
                          key={i}
                          className={`w-1 bg-gradient-to-t from-green-400 to-green-600 rounded-full transition-all duration-300 ${
                            isPlaying 
                              ? `${randomHeight} animate-pulse` 
                              : 'h-2'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    {isPlaying ? '🎵 Reproduciendo...' : '⏸️ Audio listo'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎵</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Sin audio disponible
                </h3>
                <p className="text-gray-600 text-sm">
                  Graba tu pantalla y extrae el audio para reproducirlo aquí
                </p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📝 Instrucciones</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>1. Haz clic en "Iniciar Grabación" en la sección de arriba</li>
              <li>2. Selecciona la ventana o pantalla que deseas grabar</li>
              <li>3. Asegúrate de marcar "Compartir audio" para capturar sonido</li>
              <li>4. Detén la grabación cuando termines</li>
              <li>5. Haz clic en "Extraer Audio" para procesar el sonido</li>
              <li>6. Haz clic en "🎯 Transcribir Audio" para obtener el texto</li>
              <li>7. Reproduce el audio y revisa la transcripción</li>
            </ul>
          </div>

          {/* Transcription Results */}
          {transcription && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-3">📝 Transcripción</h4>
              
              {/* Main Text */}
              <div className="bg-white p-4 rounded-lg border mb-4">
                <p className="text-gray-800 leading-relaxed">{transcription.text}</p>
              </div>
              
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><span className="font-medium text-green-700">Idioma:</span> {transcription.language}</p>
                  <p><span className="font-medium text-green-700">Modelo:</span> {transcription.model_used}</p>
                </div>
                <div>
                  <p><span className="font-medium text-green-700">Tiempo:</span> {transcription.processing_time.toFixed(2)}s</p>
                  <p><span className="font-medium text-green-700">Segmentos:</span> {transcription.segments.length}</p>
                </div>
              </div>
              
              {/* Segments with timestamps */}
              {transcription.segments.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium text-green-800 mb-2">⏱️ Segmentos con tiempo</h5>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {transcription.segments.map((segment) => (
                      <div key={segment.id} className="bg-white p-2 rounded border text-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-green-600 font-medium">
                            {Math.floor(segment.start / 60)}:{(segment.start % 60).toFixed(1).padStart(4, '0')} - {Math.floor(segment.end / 60)}:{(segment.end % 60).toFixed(1).padStart(4, '0')}
                          </span>
                          {segment.confidence && (
                            <span className="text-xs text-gray-500">
                              {(segment.confidence * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700">{segment.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Debug Info */}
          {audioBlob && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-700 text-sm mb-2">🔍 Información Técnica</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Tipo de audio: {audioBlob.type}</p>
                <p>Tamaño del blob: {audioBlob.size} bytes</p>
                {audioInfo && (
                  <>
                    <p>Sample Rate: {audioInfo.sampleRate}Hz</p>
                    <p>Canales: {audioInfo.channels}</p>
                    <p>Duración: {audioInfo.duration.toFixed(2)}s</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}