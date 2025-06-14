import React, { useState } from 'react';
import { ScreenRecorder } from './ScreenRecorder';
import { TranscriptionEngine } from './TranscriptionEngine';
import { toast } from 'sonner';

type Step = 'record' | 'transcribe' | 'complete';

interface RecordingManagerProps {
  onBack?: () => void;
  onComplete?: (result: any) => void;
}

export function RecordingManager({ onBack, onComplete }: RecordingManagerProps) {
  const [currentStep, setCurrentStep] = useState<Step>('record');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);

  const handleRecordingComplete = (video: Blob, audio: Blob) => {
    setVideoBlob(video);
    setAudioBlob(audio);
    setCurrentStep('transcribe');
    toast.success('¡Audio extraído! Ahora puedes transcribirlo.');
  };

  const handleTranscriptionComplete = (result: any) => {
    setTranscriptionResult(result);
    setCurrentStep('complete');
    onComplete?.(result);
    toast.success('¡Transcripción completada!');
  };

  const handleStartOver = () => {
    setCurrentStep('record');
    setVideoBlob(null);
    setAudioBlob(null);
    setTranscriptionResult(null);
  };

  const getStepNumber = (step: Step): number => {
    switch (step) {
      case 'record': return 1;
      case 'transcribe': return 2;
      case 'complete': return 3;
    }
  };

  const isStepCompleted = (step: Step): boolean => {
    switch (step) {
      case 'record': return !!audioBlob;
      case 'transcribe': return !!transcriptionResult;
      case 'complete': return !!transcriptionResult;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Volver
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Grabación y Transcripción
            </h1>
            <p className="text-gray-600">
              Graba tu pantalla y convierte el audio a texto usando IA local
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-8">
          {/* Step 1: Record */}
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'record' 
                ? 'bg-blue-500 text-white' 
                : isStepCompleted('record')
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
            }`}>
              {isStepCompleted('record') ? '✓' : '1'}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              currentStep === 'record' ? 'text-blue-600' : 'text-gray-600'
            }`}>
              Grabar Pantalla
            </span>
          </div>

          {/* Arrow */}
          <div className="w-8 h-0.5 bg-gray-300"></div>

          {/* Step 2: Transcribe */}
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'transcribe' 
                ? 'bg-blue-500 text-white' 
                : isStepCompleted('transcribe')
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
            }`}>
              {isStepCompleted('transcribe') ? '✓' : '2'}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              currentStep === 'transcribe' ? 'text-blue-600' : 'text-gray-600'
            }`}>
              Transcribir Audio
            </span>
          </div>

          {/* Arrow */}
          <div className="w-8 h-0.5 bg-gray-300"></div>

          {/* Step 3: Complete */}
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'complete' 
                ? 'bg-blue-500 text-white' 
                : isStepCompleted('complete')
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
            }`}>
              {isStepCompleted('complete') ? '✓' : '3'}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              currentStep === 'complete' ? 'text-blue-600' : 'text-gray-600'
            }`}>
              Completado
            </span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {currentStep === 'record' && (
          <div>
            <ScreenRecorder
              onRecordingComplete={handleRecordingComplete}
              onError={(error) => {
                console.error('Recording error:', error);
                toast.error(error);
              }}
            />
          </div>
        )}

        {currentStep === 'transcribe' && (
          <div>
            <TranscriptionEngine
              audioBlob={audioBlob}
              onTranscriptionComplete={handleTranscriptionComplete}
              onError={(error) => {
                console.error('Transcription error:', error);
                toast.error(error);
              }}
            />
            
            {/* Navigation */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setCurrentStep('record')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Volver a grabar
              </button>
            </div>
          </div>
        )}

        {currentStep === 'complete' && transcriptionResult && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">🎉</span>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Transcripción Completada!
              </h2>
              <p className="text-gray-600">
                Tu audio ha sido transcrito exitosamente usando IA local
              </p>
            </div>

            {/* Results Summary */}
            <div className="bg-gray-50 rounded-lg p-6 text-left max-w-2xl mx-auto">
              <h3 className="font-semibold mb-4">Resumen:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Texto transcrito:</span>
                  <span className="font-medium">{transcriptionResult.text.length} caracteres</span>
                </div>
                {transcriptionResult.language && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Idioma detectado:</span>
                    <span className="font-medium">{transcriptionResult.language}</span>
                  </div>
                )}
                {transcriptionResult.chunks && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Segmentos:</span>
                    <span className="font-medium">{transcriptionResult.chunks.length}</span>
                  </div>
                )}
              </div>
              
              {/* Preview */}
              <div className="mt-4 p-3 bg-white rounded border">
                <p className="text-sm text-gray-700 line-clamp-3">
                  {transcriptionResult.text.substring(0, 200)}
                  {transcriptionResult.text.length > 200 && '...'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleStartOver}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                🔄 Nueva Grabación
              </button>
              
              <button
                onClick={() => setCurrentStep('transcribe')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                📝 Ver Transcripción
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Browser Requirements */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Requisitos del navegador:</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• HTTPS habilitado (automático en desarrollo)</li>
          <li>• Chrome 72+, Firefox 66+, Safari 13+</li>
          <li>• Permisos de grabación de pantalla</li>
          <li>• Seleccionar "Compartir audio" para capturar audio del sistema</li>
        </ul>
      </div>
    </div>
  );
}
