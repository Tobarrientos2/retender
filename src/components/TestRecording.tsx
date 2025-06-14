import React, { useState } from 'react';
import { toast } from 'sonner';

export function TestRecording() {
  const [isTestingRecording, setIsTestingRecording] = useState(false);
  const [isTestingTranscription, setIsTestingTranscription] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const addTestResult = (test: string, status: 'success' | 'error', message: string) => {
    setTestResults(prev => [...prev, { test, status, message, timestamp: new Date() }]);
  };

  const testMediaRecorderSupport = () => {
    try {
      if (!navigator.mediaDevices) {
        throw new Error('navigator.mediaDevices no disponible');
      }
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error('getDisplayMedia no soportado');
      }
      if (!MediaRecorder) {
        throw new Error('MediaRecorder no soportado');
      }
      
      addTestResult('MediaRecorder Support', 'success', 'Todas las APIs necesarias están disponibles');
      return true;
    } catch (error) {
      addTestResult('MediaRecorder Support', 'error', error instanceof Error ? error.message : 'Error desconocido');
      return false;
    }
  };

  const testAudioContextSupport = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        throw new Error('AudioContext no soportado');
      }
      
      const audioContext = new AudioContext();
      audioContext.close();
      
      addTestResult('AudioContext Support', 'success', 'AudioContext disponible');
      return true;
    } catch (error) {
      addTestResult('AudioContext Support', 'error', error instanceof Error ? error.message : 'Error desconocido');
      return false;
    }
  };

  const testWebWorkerSupport = () => {
    try {
      if (!Worker) {
        throw new Error('Web Workers no soportados');
      }
      
      // Test basic worker creation
      const testWorker = new Worker(
        URL.createObjectURL(new Blob(['self.postMessage("test")'], { type: 'application/javascript' }))
      );
      
      testWorker.onmessage = () => {
        testWorker.terminate();
        addTestResult('Web Worker Support', 'success', 'Web Workers funcionando');
      };
      
      testWorker.onerror = () => {
        addTestResult('Web Worker Support', 'error', 'Error creando Web Worker');
      };
      
      return true;
    } catch (error) {
      addTestResult('Web Worker Support', 'error', error instanceof Error ? error.message : 'Error desconocido');
      return false;
    }
  };

  const testTransformersJSImport = async () => {
    try {
      // Test if we can import transformers.js
      const transformers = await import('@huggingface/transformers');
      if (!transformers.pipeline) {
        throw new Error('pipeline function no disponible');
      }

      addTestResult('Transformers.js Import', 'success', 'Librería importada correctamente');
      return true;
    } catch (error) {
      addTestResult('Transformers.js Import', 'error', error instanceof Error ? error.message : 'Error importando');
      return false;
    }
  };

  const testRecordingCapabilities = async () => {
    setIsTestingRecording(true);
    
    try {
      // Test 1: MediaRecorder support
      testMediaRecorderSupport();
      
      // Test 2: AudioContext support
      testAudioContextSupport();
      
      // Test 3: Web Worker support
      testWebWorkerSupport();
      
      // Test 4: HTTPS requirement
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        addTestResult('HTTPS Check', 'error', 'HTTPS requerido para MediaRecorder');
      } else {
        addTestResult('HTTPS Check', 'success', 'Protocolo seguro detectado');
      }
      
      // Test 5: Supported MIME types
      const supportedTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm',
        'video/mp4',
        'audio/webm;codecs=opus',
        'audio/webm'
      ].filter(type => MediaRecorder.isTypeSupported(type));
      
      if (supportedTypes.length > 0) {
        addTestResult('MIME Types', 'success', `Soportados: ${supportedTypes.join(', ')}`);
      } else {
        addTestResult('MIME Types', 'error', 'No hay tipos MIME soportados');
      }
      
      toast.success('Tests de grabación completados');
      
    } catch (error) {
      addTestResult('Recording Test', 'error', error instanceof Error ? error.message : 'Error en tests');
      toast.error('Error en tests de grabación');
    } finally {
      setIsTestingRecording(false);
    }
  };

  const testTranscriptionCapabilities = async () => {
    setIsTestingTranscription(true);
    
    try {
      // Test 1: Transformers.js import
      await testTransformersJSImport();
      
      // Test 2: Worker file accessibility
      try {
        const response = await fetch('/workers/transcription-worker.js');
        if (response.ok) {
          addTestResult('Worker File', 'success', 'Archivo de worker accesible');
        } else {
          addTestResult('Worker File', 'error', `Worker no encontrado: ${response.status}`);
        }
      } catch (error) {
        addTestResult('Worker File', 'error', 'Error accediendo al worker');
      }
      
      // Test 3: IndexedDB support (for model caching)
      try {
        if (!indexedDB) {
          throw new Error('IndexedDB no soportado');
        }
        addTestResult('IndexedDB Support', 'success', 'Disponible para cache de modelos');
      } catch (error) {
        addTestResult('IndexedDB Support', 'error', 'No disponible');
      }
      
      // Test 4: Memory estimation
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        addTestResult('Memory Usage', 'success', `${memoryMB}MB en uso`);
      } else {
        addTestResult('Memory Usage', 'error', 'Información de memoria no disponible');
      }
      
      toast.success('Tests de transcripción completados');
      
    } catch (error) {
      addTestResult('Transcription Test', 'error', error instanceof Error ? error.message : 'Error en tests');
      toast.error('Error en tests de transcripción');
    } finally {
      setIsTestingTranscription(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🧪 Test de Compatibilidad
        </h2>
        <p className="text-gray-600">
          Verifica que tu navegador soporte todas las funcionalidades necesarias
        </p>
      </div>

      {/* Test Controls */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={testRecordingCapabilities}
          disabled={isTestingRecording}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
        >
          {isTestingRecording ? '🔄 Probando...' : '📹 Test Grabación'}
        </button>
        
        <button
          onClick={testTranscriptionCapabilities}
          disabled={isTestingTranscription}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors"
        >
          {isTestingTranscription ? '🔄 Probando...' : '🎤 Test Transcripción'}
        </button>
        
        <button
          onClick={clearResults}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          🗑️ Limpiar
        </button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Resultados de Tests:</h3>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {result.status === 'success' ? '✅' : '❌'} {result.test}
                  </span>
                  <span className="text-xs text-gray-500">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${
                  result.status === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browser Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold mb-2">Información del Navegador:</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>User Agent: {navigator.userAgent}</div>
          <div>Protocolo: {location.protocol}</div>
          <div>Host: {location.host}</div>
        </div>
      </div>
    </div>
  );
}
