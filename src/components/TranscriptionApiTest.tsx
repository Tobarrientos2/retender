import React, { useState, useEffect } from 'react';
import { useTranscriptionApi } from '../hooks/useTranscriptionApi';
import { createTestAudio, audioDataToWavBlob, getAudioInfo } from '../utils/audioProcessor';
import { toast } from 'sonner';

export function TranscriptionApiTest() {
  const {
    state,
    transcribeAudio,
    checkApiHealth,
    getAvailableModels,
    getSupportedLanguages,
    clearResult,
    clearError,
    setApiUrl
  } = useTranscriptionApi();

  const [testAudioBlob, setTestAudioBlob] = useState<Blob | null>(null);
  const [apiUrl, setApiUrlState] = useState('http://localhost:8001');
  const [selectedModel, setSelectedModel] = useState('base');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [models, setModels] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);

  // Verificar API al cargar
  useEffect(() => {
    checkApiHealth();
  }, [checkApiHealth]);

  // Cargar modelos y idiomas cuando la API esté disponible
  useEffect(() => {
    if (state.isApiAvailable) {
      loadModelsAndLanguages();
    }
  }, [state.isApiAvailable]);

  const loadModelsAndLanguages = async () => {
    try {
      const [modelsData, languagesData] = await Promise.all([
        getAvailableModels(),
        getSupportedLanguages()
      ]);
      setModels(modelsData);
      setLanguages(languagesData);
    } catch (error) {
      console.error('Error loading models/languages:', error);
    }
  };

  const createTestAudioHandler = () => {
    try {
      const audioResult = createTestAudio(440, 3, 16000);
      const blob = audioDataToWavBlob(audioResult);
      setTestAudioBlob(blob);
      toast.success(`Audio de prueba creado: ${getAudioInfo(audioResult)}`);
    } catch (error) {
      console.error('Error creando audio de prueba:', error);
      toast.error('Error creando audio de prueba');
    }
  };

  const handleTranscribe = async () => {
    if (!testAudioBlob) {
      toast.error('Primero crea un audio de prueba');
      return;
    }

    try {
      await transcribeAudio(testAudioBlob, {
        language: selectedLanguage === 'auto' ? undefined : selectedLanguage,
        model: selectedModel,
        return_timestamps: true,
        temperature: 0.0
      });
    } catch (error) {
      console.error('Error en transcripción:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await transcribeAudio(file, {
        language: selectedLanguage === 'auto' ? undefined : selectedLanguage,
        model: selectedModel,
        return_timestamps: true,
        temperature: 0.0
      });
    } catch (error) {
      console.error('Error en transcripción:', error);
    }
  };

  const handleApiUrlChange = () => {
    setApiUrl(apiUrl);
    checkApiHealth();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">🐍 Test API Python de Transcripción</h2>
      
      {/* Configuración de API */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">⚙️ Configuración de API</h3>
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrlState(e.target.value)}
            placeholder="URL de la API"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleApiUrlChange}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Conectar
          </button>
        </div>
      </div>

      {/* Estado de la API */}
      <div className="mb-6 p-4 rounded-lg border-2 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${state.isApiAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-semibold">
              {state.isApiAvailable ? '✅ API Conectada' : '❌ API No Disponible'}
            </span>
          </div>
          <button
            onClick={checkApiHealth}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
          >
            🔄 Verificar
          </button>
        </div>
        
        {state.apiInfo && (
          <div className="mt-2 text-sm text-gray-600">
            <p>Versión: {state.apiInfo.version}</p>
            <p>Estado: {state.apiInfo.message}</p>
          </div>
        )}
      </div>

      {/* Configuración de transcripción */}
      {state.isApiAvailable && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-3">🎛️ Configuración de Transcripción</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Modelo:</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {models.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name} ({model.size}) - {model.description}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Idioma:</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Controles de audio */}
      <div className="mb-6 space-y-4">
        <div className="flex space-x-4">
          <button
            onClick={createTestAudioHandler}
            disabled={!state.isApiAvailable}
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            🎵 Crear Audio de Prueba
          </button>
          
          <label className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 cursor-pointer transition-colors text-center">
            📁 Subir Archivo de Audio
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileUpload}
              disabled={!state.isApiAvailable || state.isTranscribing}
              className="hidden"
            />
          </label>
        </div>

        {testAudioBlob && (
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-green-700">✅ Audio de prueba listo ({Math.round(testAudioBlob.size / 1024)}KB)</p>
          </div>
        )}
      </div>

      {/* Botón de transcripción */}
      <div className="mb-6">
        <button
          onClick={handleTranscribe}
          disabled={!testAudioBlob || !state.isApiAvailable || state.isTranscribing}
          className="w-full px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {state.isTranscribing ? '🔄 Transcribiendo...' : '🎤 Transcribir Audio'}
        </button>
      </div>

      {/* Progreso */}
      {state.isTranscribing && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-700">Transcribiendo...</span>
            <span className="text-sm text-blue-600">{state.progress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-red-700 mb-2">❌ Error:</h4>
              <p className="text-red-600 text-sm">{state.error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {state.result && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-semibold text-green-700">✅ Transcripción Completada</h4>
            <button
              onClick={clearResult}
              className="text-green-500 hover:text-green-700"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <strong className="text-green-700">Texto:</strong>
              <p className="text-green-600 mt-1 p-2 bg-white rounded border">
                {state.result.text || 'Sin texto detectado'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong>Idioma:</strong> {state.result.language}
              </div>
              <div>
                <strong>Modelo:</strong> {state.result.model_used}
              </div>
              <div>
                <strong>Duración:</strong> {formatDuration(state.result.audio_info.duration)}
              </div>
              <div>
                <strong>Tiempo:</strong> {state.result.processing_time.toFixed(2)}s
              </div>
            </div>

            {state.result.segments && state.result.segments.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer font-medium text-green-700">
                  Ver Segmentos ({state.result.segments.length})
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto">
                  {state.result.segments.map((segment, index) => (
                    <div key={index} className="text-xs bg-white p-2 rounded border mb-1">
                      <span className="text-gray-500">
                        [{formatDuration(segment.start)} - {formatDuration(segment.end)}]:
                      </span>
                      <span className="ml-2">{segment.text}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
