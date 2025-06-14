// simple-test-worker.js
// Worker básico para probar si ES modules funcionan

console.log('Worker iniciando...');

// Test básico sin importaciones externas
self.postMessage({
  type: 'ready',
  message: 'Simple worker inicializado correctamente'
});

self.onmessage = function(e) {
  console.log('Worker recibió mensaje:', e.data);
  
  const { type, data } = e.data;
  
  try {
    switch (type) {
      case 'ping':
        self.postMessage({
          type: 'pong',
          message: 'Worker respondiendo correctamente',
          timestamp: Date.now()
        });
        break;
        
      case 'test-import':
        // Intentar importar dinámicamente desde CDN
        const testImport = async () => {
          try {
            // Probar unpkg
            const transformers = await import('https://unpkg.com/@huggingface/transformers@3.5.2/dist/transformers.min.js');
            self.postMessage({
              type: 'import-success',
              message: 'Transformers importado desde unpkg',
              hasTransformers: !!transformers,
              hasPipeline: !!transformers.pipeline,
              source: 'unpkg'
            });
          } catch (error1) {
            try {
              // Probar esm.sh
              const transformers = await import('https://esm.sh/@huggingface/transformers@3.5.2');
              self.postMessage({
                type: 'import-success',
                message: 'Transformers importado desde esm.sh',
                hasTransformers: !!transformers,
                hasPipeline: !!transformers.pipeline,
                source: 'esm.sh'
              });
            } catch (error2) {
              try {
                // Probar skypack
                const transformers = await import('https://cdn.skypack.dev/@huggingface/transformers@3.5.2');
                self.postMessage({
                  type: 'import-success',
                  message: 'Transformers importado desde skypack',
                  hasTransformers: !!transformers,
                  hasPipeline: !!transformers.pipeline,
                  source: 'skypack'
                });
              } catch (error3) {
                self.postMessage({
                  type: 'import-error',
                  error: `Error importando desde todos los CDNs: unpkg(${error1.message}), esm.sh(${error2.message}), skypack(${error3.message})`,
                  errors: {
                    unpkg: error1.message,
                    esm: error2.message,
                    skypack: error3.message
                  }
                });
              }
            }
          }
        };
        testImport();
        break;
        
      default:
        self.postMessage({
          type: 'error',
          error: `Tipo de mensaje desconocido: ${type}`
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: `Error procesando mensaje: ${error.message}`,
      stack: error.stack
    });
  }
};

self.onerror = function(error) {
  console.error('Error en worker:', error);
  self.postMessage({
    type: 'worker-error',
    error: `Error global en worker: ${error.message}`,
    filename: error.filename,
    lineno: error.lineno,
    colno: error.colno
  });
};

console.log('Worker configurado completamente');
