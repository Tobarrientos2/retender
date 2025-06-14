import React, { useState } from 'react';
import { useTranscription, exportTranscriptionAsText, exportTranscriptionAsSRT, exportTranscriptionAsJSON } from '../hooks/useTranscription';
import { toast } from 'sonner';

interface TranscriptionEngineProps {
  audioBlob: Blob | null;
  onTranscriptionComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

const LANGUAGE_OPTIONS = [
  { code: 'auto', name: 'Detectar automáticamente' },
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ar', name: 'العربية' },
  { code: 'ru', name: 'Русский' },
  { code: 'hi', name: 'हिन्दी' },
];

export function TranscriptionEngine({ audioBlob, onTranscriptionComplete, onError }: TranscriptionEngineProps) {
  const { state, transcribeAudio, clearTranscription, isWorkerReady } = useTranscription();
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);

  const handleStartTranscription = async () => {
    if (!audioBlob) {
      toast.error('No hay audio para transcribir');
      return;
    }

    try {
      await transcribeAudio(audioBlob, {
        language: selectedLanguage === 'auto' ? undefined : selectedLanguage,
        returnTimestamps: includeTimestamps,
        chunkLengthS: 30
      });

      if (state.result) {
        toast.success('Transcripción completada');
        onTranscriptionComplete?.(state.result);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error en transcripción';
      toast.error(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleClearTranscription = () => {
    clearTranscription();
    toast.info('Transcripción eliminada');
  };

  const downloadTranscription = (format: 'txt' | 'srt' | 'json') => {
    if (!state.result) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'txt':
        content = exportTranscriptionAsText(state.result);
        filename = `transcripcion-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        mimeType = 'text/plain';
        break;
      case 'srt':
        content = exportTranscriptionAsSRT(state.result);
        filename = `transcripcion-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.srt`;
        mimeType = 'text/plain';
        break;
      case 'json':
        content = exportTranscriptionAsJSON(state.result);
        filename = `transcripcion-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        mimeType = 'application/json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Transcripción descargada como ${format.toUpperCase()}`);
  };

  const getAudioInfo = () => {
    if (!audioBlob) return null;
    const sizeInMB = (audioBlob.size / (1024 * 1024)).toFixed(2);
    return {
      size: `${sizeInMB} MB`,
      type: audioBlob.type
    };
  };

  const audioInfo = getAudioInfo();

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎤 Transcripción de Audio
        </h2>
        <p className="text-gray-600">
          Convierte audio a texto usando IA local (Whisper)
        </p>
      </div>

      {/* Worker Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Estado del motor:</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isWorkerReady 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {isWorkerReady ? '✅ Listo' : '⏳ Cargando...'}
          </span>
        </div>
      </div>

      {/* Audio Info */}
      {audioInfo && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Audio cargado:</h3>
          <div className="space-y-1 text-sm text-blue-700">
            <div className="flex justify-between">
              <span>Tamaño:</span>
              <span>{audioInfo.size}</span>
            </div>
            <div className="flex justify-between">
              <span>Formato:</span>
              <span>{audioInfo.type}</span>
            </div>
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Idioma del audio:
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={state.isTranscribing}
          >
            {LANGUAGE_OPTIONS.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="timestamps"
            checked={includeTimestamps}
            onChange={(e) => setIncludeTimestamps(e.target.checked)}
            disabled={state.isTranscribing}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="timestamps" className="ml-2 text-sm text-gray-700">
            Incluir marcas de tiempo
          </label>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">❌ {state.error}</p>
        </div>
      )}

      {/* Progress Display */}
      {state.progress && (
        <div className="mb-6 space-y-3">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {state.progress.message}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${state.progress.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(state.progress.progress)}%
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-4">
        {!state.isTranscribing && !state.result && (
          <button
            onClick={handleStartTranscription}
            disabled={!audioBlob || !isWorkerReady}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {!isWorkerReady ? '⏳ Cargando motor...' : '🎤 Iniciar Transcripción'}
          </button>
        )}

        {state.isTranscribing && (
          <div className="text-center">
            <div className="animate-pulse text-blue-500 font-medium">
              🔄 Transcribiendo audio...
            </div>
          </div>
        )}

        {state.result && (
          <div className="space-y-4">
            {/* Transcription Result */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Transcripción:</h4>
              <div className="max-h-40 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap">{state.result.text}</p>
              </div>
              {state.result.language && (
                <p className="text-xs text-gray-500 mt-2">
                  Idioma detectado: {state.result.language}
                </p>
              )}
            </div>

            {/* Download Options */}
            <div className="flex space-x-2">
              <button
                onClick={() => downloadTranscription('txt')}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                📄 TXT
              </button>
              <button
                onClick={() => downloadTranscription('srt')}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
              >
                🎬 SRT
              </button>
              <button
                onClick={() => downloadTranscription('json')}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
              >
                📊 JSON
              </button>
            </div>

            <button
              onClick={handleClearTranscription}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              🗑️ Nueva Transcripción
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700 text-xs">
          💡 <strong>Nota:</strong> La transcripción se realiza completamente en tu navegador. 
          Tus archivos de audio nunca salen de tu dispositivo.
        </p>
      </div>
    </div>
  );
}
