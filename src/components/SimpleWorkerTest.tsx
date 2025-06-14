import React, { useState } from 'react';
import { toast } from 'sonner';

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export function SimpleWorkerTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (step: string, status: 'pending' | 'success' | 'error', message: string, details?: any) => {
    setResults(prev => [...prev, { step, status, message, details }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const runTests = async () => {
    setIsRunning(true);
    clearResults();

    try {
      addResult('1. Crear Worker', 'pending', 'Intentando crear worker simple...');

      const worker = new Worker('/workers/simple-test-worker.js', {
        type: 'module'
      });

      addResult('1. Crear Worker', 'success', 'Worker creado exitosamente');

      // Test 1: Verificar que el worker se inicializa
      addResult('2. Inicialización', 'pending', 'Esperando mensaje de inicialización...');

      const messagePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout esperando respuesta del worker'));
        }, 10000);

        worker.onmessage = (e) => {
          clearTimeout(timeout);
          const { type, message, error } = e.data;
          
          if (type === 'ready') {
            addResult('2. Inicialización', 'success', `Worker listo: ${message}`);
            resolve(e.data);
          } else if (type === 'error' || type === 'worker-error') {
            addResult('2. Inicialización', 'error', `Error: ${error}`, e.data);
            reject(new Error(error));
          } else {
            addResult('3. Comunicación', 'success', `Mensaje recibido: ${type}`, e.data);
          }
        };

        worker.onerror = (error) => {
          clearTimeout(timeout);
          addResult('2. Inicialización', 'error', `Error en worker: ${error.message}`, {
            message: error.message,
            filename: error.filename,
            lineno: error.lineno,
            colno: error.colno,
            error: error.error
          });
          reject(error);
        };
      });

      await messagePromise;

      // Test 2: Ping-Pong
      addResult('3. Comunicación', 'pending', 'Probando comunicación bidireccional...');
      
      const pingPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout en ping-pong'));
        }, 5000);

        const originalOnMessage = worker.onmessage;
        worker.onmessage = (e) => {
          if (e.data.type === 'pong') {
            clearTimeout(timeout);
            addResult('3. Comunicación', 'success', `Ping-Pong exitoso: ${e.data.message}`, e.data);
            worker.onmessage = originalOnMessage;
            resolve(e.data);
          } else {
            originalOnMessage?.(e);
          }
        };

        worker.postMessage({ type: 'ping' });
      });

      await pingPromise;

      // Test 3: Importación de Transformers
      addResult('4. Import Transformers', 'pending', 'Probando importación de @huggingface/transformers...');
      
      const importPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout importando transformers'));
        }, 30000); // 30 segundos para importación

        const originalOnMessage = worker.onmessage;
        worker.onmessage = (e) => {
          if (e.data.type === 'import-success') {
            clearTimeout(timeout);
            addResult('4. Import Transformers', 'success', `Transformers importado: ${e.data.message}`, e.data);
            worker.onmessage = originalOnMessage;
            resolve(e.data);
          } else if (e.data.type === 'import-error') {
            clearTimeout(timeout);
            addResult('4. Import Transformers', 'error', `Error importando: ${e.data.error}`, e.data);
            worker.onmessage = originalOnMessage;
            reject(new Error(e.data.error));
          } else {
            originalOnMessage?.(e);
          }
        };

        worker.postMessage({ type: 'test-import' });
      });

      await importPromise;

      addResult('5. Finalización', 'success', 'Todos los tests completados exitosamente');
      toast.success('Tests completados exitosamente');

      // Cleanup
      setTimeout(() => {
        worker.terminate();
        addResult('6. Cleanup', 'success', 'Worker terminado');
      }, 1000);

    } catch (error) {
      addResult('Error', 'error', `Test falló: ${error instanceof Error ? error.message : error}`);
      toast.error(`Test falló: ${error instanceof Error ? error.message : error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
    }
  };

  const getStatusColor = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">🧪 Test Simple del Worker</h2>
      
      <div className="mb-6 text-center">
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium mr-4"
        >
          {isRunning ? '🔄 Ejecutando Tests...' : '🚀 Ejecutar Tests'}
        </button>
        
        <button
          onClick={clearResults}
          disabled={isRunning}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          🗑️ Limpiar Resultados
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div key={index} className={`p-4 border rounded-lg ${getStatusColor(result.status)}`}>
            <div className="flex items-center space-x-3">
              <span className="text-xl">{getStatusIcon(result.status)}</span>
              <div className="flex-1">
                <h4 className="font-semibold">{result.step}</h4>
                <p className="text-sm">{result.message}</p>
                {result.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-mono">Ver detalles</summary>
                    <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No hay resultados aún. Haz clic en "Ejecutar Tests" para comenzar.</p>
        </div>
      )}
    </div>
  );
}
