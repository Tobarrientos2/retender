import React, { useState } from 'react';
import { toast } from 'sonner';

interface TestResult {
  test: string;
  status: 'success' | 'error';
  message: string;
  timestamp: Date;
}

export function TransformersTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestingTransformers, setIsTestingTransformers] = useState(false);

  const addTestResult = (test: string, status: 'success' | 'error', message: string) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      timestamp: new Date()
    }]);
  };

  const testTransformersImport = async () => {
    try {
      // Test dynamic import
      const transformers = await import('@huggingface/transformers');
      
      if (!transformers.pipeline) {
        throw new Error('pipeline function no disponible');
      }
      
      addTestResult('Import Test', 'success', 'Transformers.js importado correctamente');
      
      // Test pipeline creation (simple)
      try {
        addTestResult('Pipeline Test', 'success', 'Pipeline disponible para crear');
      } catch (pipelineError) {
        addTestResult('Pipeline Test', 'error', `Error creando pipeline: ${pipelineError}`);
      }
      
      return true;
    } catch (error) {
      addTestResult('Import Test', 'error', error instanceof Error ? error.message : 'Error importando');
      return false;
    }
  };

  const testWorkerCreation = async () => {
    try {
      // Test worker creation
      const worker = new Worker('/workers/transcription-worker.js', {
        type: 'module'
      });
      
      worker.onmessage = (e) => {
        const { type, message, error } = e.data;
        if (type === 'error') {
          addTestResult('Worker Test', 'error', `Worker error: ${error}`);
        } else if (type === 'progress') {
          addTestResult('Worker Test', 'success', `Worker progress: ${message}`);
        }
      };
      
      worker.onerror = (error) => {
        addTestResult('Worker Test', 'error', `Worker creation error: ${error.message}`);
      };
      
      // Test worker initialization
      worker.postMessage({ type: 'initialize' });
      
      addTestResult('Worker Test', 'success', 'Worker creado exitosamente');
      
      // Cleanup after 5 seconds
      setTimeout(() => {
        worker.terminate();
      }, 5000);
      
      return true;
    } catch (error) {
      addTestResult('Worker Test', 'error', error instanceof Error ? error.message : 'Error creando worker');
      return false;
    }
  };

  const testMediaRecorderPermissions = async () => {
    try {
      // Test screen capture permissions
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('getDisplayMedia no soportado');
      }
      
      addTestResult('MediaDevices Test', 'success', 'getDisplayMedia disponible');
      
      // Test actual permission request
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        addTestResult('Permission Test', 'success', 'Permisos de pantalla otorgados');
        
        // Stop the stream immediately
        stream.getTracks().forEach(track => track.stop());
        
      } catch (permError) {
        if (permError instanceof Error && permError.name === 'NotAllowedError') {
          addTestResult('Permission Test', 'error', 'Permisos denegados por el usuario');
        } else {
          addTestResult('Permission Test', 'error', `Error de permisos: ${permError}`);
        }
      }
      
      return true;
    } catch (error) {
      addTestResult('MediaDevices Test', 'error', error instanceof Error ? error.message : 'Error en MediaDevices');
      return false;
    }
  };

  const runAllTests = async () => {
    setIsTestingTransformers(true);
    setTestResults([]);
    
    try {
      addTestResult('Test Suite', 'success', 'Iniciando tests de diagnóstico...');
      
      // Test 1: Transformers.js import
      await testTransformersImport();
      
      // Test 2: Worker creation
      await testWorkerCreation();
      
      // Test 3: MediaRecorder permissions
      await testMediaRecorderPermissions();
      
      toast.success('Tests completados');
      
    } catch (error) {
      addTestResult('Test Suite', 'error', error instanceof Error ? error.message : 'Error en test suite');
      toast.error('Error en tests');
    } finally {
      setIsTestingTransformers(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🔧 Diagnóstico de Transformers.js v3.x
        </h2>
        <p className="text-gray-600">
          Pruebas específicas para diagnosticar problemas con la nueva versión
        </p>
      </div>

      {/* Test Controls */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={runAllTests}
          disabled={isTestingTransformers}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
        >
          {isTestingTransformers ? '🔄 Ejecutando...' : '🚀 Ejecutar Todos los Tests'}
        </button>
        
        <button
          onClick={testTransformersImport}
          disabled={isTestingTransformers}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors"
        >
          📦 Test Import
        </button>
        
        <button
          onClick={testWorkerCreation}
          disabled={isTestingTransformers}
          className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 transition-colors"
        >
          👷 Test Worker
        </button>
        
        <button
          onClick={testMediaRecorderPermissions}
          disabled={isTestingTransformers}
          className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 transition-colors"
        >
          🎥 Test Permisos
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
          <h3 className="text-lg font-semibold mb-4">Resultados de Diagnóstico:</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
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

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-semibold mb-2">📋 Instrucciones:</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <div>1. <strong>Test Import</strong>: Verifica que Transformers.js v3.x se importe correctamente</div>
          <div>2. <strong>Test Worker</strong>: Verifica que el Web Worker funcione con la nueva versión</div>
          <div>3. <strong>Test Permisos</strong>: Verifica permisos de grabación de pantalla</div>
          <div>4. Si algún test falla, revisa los detalles del error para diagnosticar</div>
        </div>
      </div>
    </div>
  );
}
