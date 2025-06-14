import React, { useState } from 'react';
import { useTranscription } from '../hooks/useTranscription';
import { createTestAudio, audioDataToWavBlob, getAudioInfo } from '../utils/audioProcessor';
import { toast } from 'sonner';

export function TranscriptionTest() {
  const { state, transcribeAudio, clearTranscription, isWorkerReady } = useTranscription();
  const [testAudioBlob, setTestAudioBlob] = useState<Blob | null>(null);

  // Crear un audio de prueba simple (tono de 440Hz por 2 segundos)
  const createTestAudioHandler = () => {
    try {
      // Usar la nueva función utilitaria
      const audioResult = createTestAudio(440, 2, 16000);
      const blob = audioDataToWavBlob(audioResult);

      setTestAudioBlob(blob);
      toast.success(`Audio de prueba creado: ${getAudioInfo(audioResult)}`);
    } catch (error) {
      console.error('Error creando audio de prueba:', error);
      toast.error('Error creando audio de prueba');
    }
  };



  const handleTestTranscription = async () => {
    if (!testAudioBlob) {
      toast.error('Primero crea un audio de prueba');
      return;
    }

    try {
      await transcribeAudio(testAudioBlob, {
        language: 'auto',
        returnTimestamps: true
      });
    } catch (error) {
      console.error('Error en transcripción de prueba:', error);
      toast.error('Error en transcripción de prueba');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">🧪 Test de Transcripción</h2>
      
      {/* Worker Status */}
      <div className="mb-6 p-4 rounded-lg bg-gray-50">
        <h3 className="font-semibold mb-2">Estado del Worker:</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isWorkerReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={isWorkerReady ? 'text-green-700' : 'text-red-700'}>
            {isWorkerReady ? '✅ Worker listo' : '❌ Worker no disponible'}
          </span>
        </div>
      </div>

      {/* Test Audio Creation */}
      <div className="mb-6 space-y-3">
        <button
          onClick={createTestAudioHandler}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          🎵 Crear Audio de Prueba (Tono 440Hz)
        </button>
        
        {testAudioBlob && (
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-green-700">✅ Audio de prueba creado ({Math.round(testAudioBlob.size / 1024)}KB)</p>
          </div>
        )}
      </div>

      {/* Transcription Test */}
      <div className="mb-6 space-y-3">
        <button
          onClick={handleTestTranscription}
          disabled={!testAudioBlob || !isWorkerReady || state.isTranscribing}
          className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {state.isTranscribing ? '🔄 Transcribiendo...' : '🎤 Probar Transcripción'}
        </button>
      </div>

      {/* Progress */}
      {state.progress && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-700">
              {state.progress.message}
            </span>
            <span className="text-sm text-blue-600">
              {state.progress.progress}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${state.progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg">
          <h4 className="font-semibold text-red-700 mb-2">❌ Error:</h4>
          <p className="text-red-600 text-sm">{state.error}</p>
        </div>
      )}

      {/* Result Display */}
      {state.result && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h4 className="font-semibold text-green-700 mb-2">✅ Resultado:</h4>
          <p className="text-green-600 text-sm mb-2">
            <strong>Texto:</strong> {state.result.text || 'Sin texto detectado'}
          </p>
          <p className="text-green-600 text-sm">
            <strong>Idioma:</strong> {state.result.language}
          </p>
          {state.result.chunks && state.result.chunks.length > 0 && (
            <div className="mt-2">
              <strong className="text-green-700">Chunks:</strong>
              <ul className="text-xs text-green-600 mt-1">
                {state.result.chunks.map((chunk, index) => (
                  <li key={index}>
                    [{chunk.timestamp[0].toFixed(1)}s - {chunk.timestamp[1].toFixed(1)}s]: {chunk.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Clear Button */}
      {(state.result || state.error) && (
        <button
          onClick={clearTranscription}
          className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          🗑️ Limpiar Resultado
        </button>
      )}
    </div>
  );
}
