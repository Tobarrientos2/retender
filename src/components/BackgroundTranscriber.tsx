/**
 * Componente principal para transcripción en background con WebSocket
 * Integra con el sistema existente y proporciona UI moderna
 */

import React, { useState, useCallback } from 'react';
import { useBackgroundTranscription } from '../hooks/useBackgroundTranscription';
import { ProgressBar, ConnectionStatus } from './ProgressBar';
import type { TranscriptionResponse } from '../services/transcriptionService';

export interface BackgroundTranscriberProps {
  onTranscriptionComplete?: (result: TranscriptionResponse) => void;
  onError?: (error: string) => void;
  className?: string;
  apiBaseUrl?: string;
}

export function BackgroundTranscriber({
  onTranscriptionComplete,
  onError,
  className = '',
  apiBaseUrl
}: BackgroundTranscriberProps) {
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcriptionOptions, setTranscriptionOptions] = useState({
    language: 'auto',
    model: 'medium',
    return_timestamps: true,
    temperature: 0.0
  });

  const {
    state,
    transcribe,
    cancelJob,
    clearResult,
    clearError,
    isConnected
  } = useBackgroundTranscription({
    apiBaseUrl,
    onComplete: onTranscriptionComplete,
    onError
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      clearResult();
      clearError();
    }
  }, [clearResult, clearError]);

  const handleStartTranscription = useCallback(async () => {
    if (!selectedFile) return;
    
    try {
      await transcribe(selectedFile, transcriptionOptions);
    } catch (error) {
      console.error('Error iniciando transcripción:', error);
    }
  }, [selectedFile, transcribe, transcriptionOptions]);

  const handleCancel = useCallback(() => {
    cancelJob();
  }, [cancelJob]);

  const handleClearResult = useCallback(() => {
    clearResult();
    clearError();
    setSelectedFile(null);
  }, [clearResult, clearError]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎤 Transcripción en Background
        </h2>
        <p className="text-gray-600">
          Transcripción con IA usando Whisper Medium + WebSocket en tiempo real
        </p>
      </div>

      {/* Connection Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Estado de conexión:</span>
          <ConnectionStatus 
            isConnected={isConnected}
            isConnecting={state.isSubmitting}
            error={state.error}
          />
        </div>
      </div>

      {/* File Upload */}
      {!state.isTranscribing && !state.result && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar archivo de audio
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          {selectedFile && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-900">
                  📁 {selectedFile.name}
                </span>
                <span className="text-blue-700">
                  {formatFileSize(selectedFile.size)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transcription Options */}
      {!state.isTranscribing && !state.result && selectedFile && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Opciones de transcripción</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Idioma</label>
              <select
                value={transcriptionOptions.language}
                onChange={(e) => setTranscriptionOptions(prev => ({ ...prev, language: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">Detección automática</option>
                <option value="es">Español</option>
                <option value="en">Inglés</option>
                <option value="fr">Francés</option>
                <option value="de">Alemán</option>
                <option value="it">Italiano</option>
                <option value="pt">Portugués</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Modelo</label>
              <select
                value={transcriptionOptions.model}
                onChange={(e) => setTranscriptionOptions(prev => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="base">Base (rápido)</option>
                <option value="medium">Medium (recomendado)</option>
                <option value="large">Large (mejor calidad)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Temperatura</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={transcriptionOptions.temperature}
                onChange={(e) => setTranscriptionOptions(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Progress Section */}
      {(state.isTranscribing || state.isSubmitting) && (
        <div className="mb-6">
          <ProgressBar
            progress={state.progress}
            message={state.message}
            status={state.currentJob?.status}
            estimatedTimeRemaining={state.currentJob?.estimated_time_remaining}
            className="mb-4"
          />
          
          {/* Job Info */}
          {state.currentJob && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium text-blue-900">Job ID:</span>
                  <span className="text-blue-700 ml-2 font-mono text-xs">
                    {state.currentJob.job_id.slice(0, 8)}...
                  </span>
                </div>
                {state.queuePosition !== undefined && (
                  <div>
                    <span className="font-medium text-blue-900">Posición en cola:</span>
                    <span className="text-blue-700 ml-2">{state.queuePosition}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">❌</span>
            <span className="text-red-700 font-medium">Error:</span>
          </div>
          <p className="text-red-600 mt-1">{state.error}</p>
          <button
            onClick={clearError}
            className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Result Display */}
      {state.result && (
        <div className="mb-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-green-900">
                ✅ Transcripción completada
              </h3>
              <div className="text-sm text-green-700">
                {formatDuration(state.result.processing_time)} • {state.result.language}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded border">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {state.result.text}
              </p>
            </div>
            
            {/* Result Stats */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-green-700">
              <div>
                <span className="font-medium">Modelo:</span> {state.result.model_used}
              </div>
              <div>
                <span className="font-medium">Idioma:</span> {state.result.language}
              </div>
              <div>
                <span className="font-medium">Duración:</span> {formatDuration(state.result.audio_info.duration)}
              </div>
              <div>
                <span className="font-medium">Segmentos:</span> {state.result.segments.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex space-x-4">
        {!state.isTranscribing && !state.result && (
          <button
            onClick={handleStartTranscription}
            disabled={!selectedFile || state.isSubmitting}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {state.isSubmitting ? '📤 Enviando...' : '🎤 Iniciar Transcripción'}
          </button>
        )}

        {state.isTranscribing && (
          <button
            onClick={handleCancel}
            className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
          >
            ❌ Cancelar
          </button>
        )}

        {state.result && (
          <button
            onClick={handleClearResult}
            className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
          >
            🔄 Nueva Transcripción
          </button>
        )}
      </div>
    </div>
  );
}
