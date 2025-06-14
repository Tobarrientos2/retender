import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface WorkerStatus {
  isCreated: boolean;
  isReady: boolean;
  error: string | null;
  messages: string[];
}

export function WorkerDiagnostic() {
  const [status, setStatus] = useState<WorkerStatus>({
    isCreated: false,
    isReady: false,
    error: null,
    messages: []
  });

  const addMessage = (message: string) => {
    setStatus(prev => ({
      ...prev,
      messages: [...prev.messages, `${new Date().toLocaleTimeString()}: ${message}`]
    }));
  };

  const testWorkerCreation = () => {
    setStatus({
      isCreated: false,
      isReady: false,
      error: null,
      messages: []
    });

    addMessage('🔄 Intentando crear worker...');

    try {
      const worker = new Worker('/workers/transcription-worker.js', {
        type: 'module'
      });

      addMessage('✅ Worker creado exitosamente');
      setStatus(prev => ({ ...prev, isCreated: true }));

      worker.onmessage = (e) => {
        const { type, message, error } = e.data;
        addMessage(`📨 Mensaje recibido: ${type} - ${message || error || 'Sin contenido'}`);
        
        if (type === 'ready') {
          setStatus(prev => ({ ...prev, isReady: true }));
          addMessage('🎉 Worker listo para usar');
          toast.success('Worker inicializado correctamente');
        }
        
        if (type === 'error') {
          setStatus(prev => ({ ...prev, error: error || 'Error desconocido' }));
          addMessage(`❌ Error en worker: ${error}`);
          toast.error(`Error en worker: ${error}`);
        }
      };

      worker.onerror = (error) => {
        console.error('Worker error details:', error);
        const errorDetails = {
          message: error.message,
          filename: error.filename,
          lineno: error.lineno,
          colno: error.colno,
          error: error.error
        };

        const errorMsg = error.error ?
          `Error: ${error.error.message || error.error}` :
          `Error: ${error.message || 'Desconocido'}`;

        const detailedMsg = `${errorMsg} (Línea: ${error.lineno || 'N/A'}, Archivo: ${error.filename || 'N/A'})`;

        addMessage(`❌ ${detailedMsg}`);
        addMessage(`🔍 Detalles: ${JSON.stringify(errorDetails, null, 2)}`);
        setStatus(prev => ({ ...prev, error: detailedMsg }));
        toast.error(errorMsg);
      };

      // Cleanup después de 30 segundos
      setTimeout(() => {
        worker.terminate();
        addMessage('🔄 Worker terminado (cleanup automático)');
      }, 30000);

    } catch (error) {
      const errorMsg = `Error creando worker: ${error instanceof Error ? error.message : error}`;
      addMessage(`❌ ${errorMsg}`);
      setStatus(prev => ({ ...prev, error: errorMsg }));
      toast.error(errorMsg);
    }
  };

  const clearMessages = () => {
    setStatus({
      isCreated: false,
      isReady: false,
      error: null,
      messages: []
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">🔧 Diagnóstico del Worker</h2>
      
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-lg border-2 ${status.isCreated ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${status.isCreated ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="font-semibold">Worker Creado</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {status.isCreated ? 'Worker instanciado correctamente' : 'Worker no creado'}
          </p>
        </div>

        <div className={`p-4 rounded-lg border-2 ${status.isReady ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${status.isReady ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="font-semibold">Worker Listo</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {status.isReady ? 'Worker respondiendo mensajes' : 'Esperando respuesta'}
          </p>
        </div>

        <div className={`p-4 rounded-lg border-2 ${status.error ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${status.error ? 'bg-red-500' : 'bg-gray-400'}`}></div>
            <span className="font-semibold">Estado de Error</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {status.error ? 'Error detectado' : 'Sin errores'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={testWorkerCreation}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          🧪 Probar Worker
        </button>
        
        <button
          onClick={clearMessages}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
        >
          🗑️ Limpiar Log
        </button>
      </div>

      {/* Error Display */}
      {status.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-700 mb-2">❌ Error Detectado:</h4>
          <p className="text-red-600 text-sm font-mono">{status.error}</p>
        </div>
      )}

      {/* Messages Log */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center">
          📋 Log de Eventos
          <span className="ml-2 text-sm text-gray-500">({status.messages.length} mensajes)</span>
        </h3>
        
        <div className="max-h-64 overflow-y-auto space-y-1">
          {status.messages.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No hay mensajes aún. Haz clic en "Probar Worker" para comenzar.</p>
          ) : (
            status.messages.map((message, index) => (
              <div key={index} className="text-sm font-mono bg-white p-2 rounded border">
                {message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-700 mb-2">📖 Instrucciones:</h4>
        <ol className="text-blue-600 text-sm space-y-1">
          <li>1. Haz clic en "🧪 Probar Worker" para crear una instancia del worker</li>
          <li>2. Observa el log para ver si se crea correctamente</li>
          <li>3. Verifica que aparezca el mensaje "ready" del worker</li>
          <li>4. Si hay errores, aparecerán en rojo en el log</li>
        </ol>
      </div>
    </div>
  );
}
