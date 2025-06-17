# Task Breakdown Structure
## Sistema de Transcripción Persistente - Sincronización API ↔ Convex

## 🔴 TAREAS P0 (CRÍTICAS - BLOQUEAN MVP)

### 📋 TAREA P0.1 - Implementar Función HTTP en Convex para Sincronización
**🎯 OBJETIVO**: Crear endpoint HTTP en Convex que reciba actualizaciones de estado desde la API Python
**🔗 DEPENDENCIAS**: Convex HTTP functions, schema transcriptionJobs existente
**⏱️ ESTIMACIÓN**: Complejidad Media (4-6 horas)

#### SUBTAREAS:
##### P0.1.1 - Crear función HTTP updateTranscriptionJobFromAPI
- 🔍 **Análisis Técnico**: Convex HTTP functions permiten recibir POST requests externos
- 📊 **Diagrama**: API Python → HTTP POST → Convex Function → Database Update
- 🛠️ **Implementación MVP**: 
  ```typescript
  // convex/http.ts
  export const updateTranscriptionJob = httpAction(async (ctx, request) => {
    const { jobId, status, progress, result, timestamps } = await request.json();
    await ctx.runMutation(internal.transcriptionJobs.updateFromAPI, {
      jobId, status, progress, result, ...timestamps
    });
  });
  ```
- 🧪 **Pruebas de Integración**: Verificar que API puede llamar endpoint y actualizar DB
- 🔗 **Integraciones**: Schema transcriptionJobs, validación de jobId
- ⚡ **Performance**: Timeout de 5s, validación rápida de payload

##### P0.1.2 - Implementar función interna updateFromAPI
- 🔍 **Análisis Técnico**: Función interna que actualiza DB desde HTTP action
- 🛠️ **Implementación MVP**: Buscar job por jobId y actualizar campos
- 🧪 **Pruebas de Integración**: Verificar actualización correcta en DB
- 🔗 **Integraciones**: Índice by_job_id existente, validación de userId

### 📋 TAREA P0.2 - Implementar Cliente Convex en API Python
**🎯 OBJETIVO**: Crear cliente HTTP en API Python para enviar actualizaciones a Convex
**🔗 DEPENDENCIAS**: httpx library, Convex deployment URL, API key
**⏱️ ESTIMACIÓN**: Complejidad Media (3-4 horas)

#### SUBTAREAS:
##### P0.2.1 - Crear ConvexClient service
- 🔍 **Análisis Técnico**: Cliente HTTP con httpx para llamadas a Convex
- 📊 **Diagrama**: ConvexClient → HTTP POST → Convex HTTP API
- 🛠️ **Implementación MVP**:
  ```python
  class ConvexClient:
      def __init__(self, base_url: str, api_key: str):
          self.base_url = base_url
          self.headers = {"Authorization": f"Bearer {api_key}"}
      
      async def update_job_status(self, job_data: dict):
          async with httpx.AsyncClient() as client:
              response = await client.post(
                  f"{self.base_url}/updateTranscriptionJob",
                  json=job_data,
                  headers=self.headers,
                  timeout=5.0
              )
              response.raise_for_status()
  ```
- 🧪 **Pruebas de Integración**: Verificar conexión exitosa con Convex
- 🔗 **Integraciones**: Variables de entorno para URL y API key
- ⚡ **Performance**: Timeout de 5s, async/await

##### P0.2.2 - Integrar ConvexClient en job_queue_service
- 🔍 **Análisis Técnico**: Agregar llamada a sync después de job completion
- 🛠️ **Implementación MVP**: En _process_job después de job.status = COMPLETED
- 🧪 **Pruebas de Integración**: Verificar sync automático al completar job
- 🔗 **Integraciones**: job_queue_service._process_job method

### 📋 TAREA P0.3 - Configurar Variables de Entorno y Autenticación
**🎯 OBJETIVO**: Configurar credenciales y URLs para comunicación API ↔ Convex
**🔗 DEPENDENCIAS**: Convex deployment, API key generation
**⏱️ ESTIMACIÓN**: Complejidad Baja (1-2 horas)

#### SUBTAREAS:
##### P0.3.1 - Generar API key en Convex
- 🔍 **Análisis Técnico**: Convex dashboard permite generar HTTP API keys
- 🛠️ **Implementación MVP**: Generar key con permisos de escritura
- 🧪 **Pruebas de Integración**: Verificar autenticación exitosa
- 🔗 **Integraciones**: Convex dashboard, environment variables

##### P0.3.2 - Configurar variables de entorno en API
- 🔍 **Análisis Técnico**: .env file con CONVEX_URL y CONVEX_API_KEY
- 🛠️ **Implementación MVP**: Agregar variables y cargar en ConvexClient
- 🧪 **Pruebas de Integración**: Verificar carga correcta de configuración
- 🔗 **Integraciones**: python-dotenv, settings configuration

## 🟡 TAREAS P1 (ALTAS - IMPORTANTES PARA FUNCIONALIDAD COMPLETA)

### 📋 TAREA P1.1 - Implementar Manejo de Errores y Reintentos
**🎯 OBJETIVO**: Agregar robustez con reintentos automáticos y logging de errores
**🔗 DEPENDENCIAS**: ConvexClient implementado, logging configurado
**⏱️ ESTIMACIÓN**: Complejidad Media (2-3 horas)

#### SUBTAREAS:
##### P1.1.1 - Implementar retry logic en ConvexClient
- 🔍 **Análisis Técnico**: 3 reintentos con delay incremental
- 🛠️ **Implementación MVP**: try-except con loop de reintentos
- 🧪 **Pruebas de Integración**: Simular fallos de red y verificar reintentos
- 🔗 **Integraciones**: asyncio.sleep para delays, logging para errores

##### P1.1.2 - Agregar logging detallado de sincronización
- 🔍 **Análisis Técnico**: Log de sync attempts, successes, failures
- 🛠️ **Implementación MVP**: Structured logging con timestamps y jobId
- 🧪 **Pruebas de Integración**: Verificar logs informativos en consola
- 🔗 **Integraciones**: Python logging module, log formatting

### 📋 TAREA P1.2 - Optimizar Polling en Frontend
**🎯 OBJETIVO**: Reducir frecuencia de polling ahora que hay sincronización automática
**🔗 DEPENDENCIAS**: Sincronización API ↔ Convex funcionando
**⏱️ ESTIMACIÓN**: Complejidad Baja (1-2 horas)

#### SUBTAREAS:
##### P1.2.1 - Aumentar intervalo de polling de 2s a 10s
- 🔍 **Análisis Técnico**: Menos requests al tener sync automático
- 🛠️ **Implementación MVP**: Cambiar setInterval de 2000 a 10000ms
- 🧪 **Pruebas de Integración**: Verificar que UI sigue responsive
- 🔗 **Integraciones**: usePersistentTranscription hook

##### P1.2.2 - Agregar fallback logic si sync falla
- 🔍 **Análisis Técnico**: Mantener polling como backup
- 🛠️ **Implementación MVP**: Detectar jobs "stuck" y forzar polling
- 🧪 **Pruebas de Integración**: Simular fallo de sync y verificar fallback
- 🔗 **Integraciones**: handleJobResult method, error detection

## 🟢 TAREAS P2 (MEDIAS - MEJORAS DE EXPERIENCIA)

### 📋 TAREA P2.1 - Implementar Timestamps Precisos
**🎯 OBJETIVO**: Sincronizar timestamps exactos entre API y Convex
**🔗 DEPENDENCIAS**: Sincronización básica funcionando
**⏱️ ESTIMACIÓN**: Complejidad Baja (1-2 horas)

#### SUBTAREAS:
##### P2.1.1 - Enviar timestamps desde API a Convex
- 🔍 **Análisis Técnico**: startedAt, completedAt desde job_queue_service
- 🛠️ **Implementación MVP**: Incluir timestamps en payload de sync
- 🧪 **Pruebas de Integración**: Verificar timestamps correctos en UI
- 🔗 **Integraciones**: TranscriptionJob model, datetime serialization

### 📋 TAREA P2.2 - Agregar Validación de Payload
**🎯 OBJETIVO**: Validar datos antes de actualizar Convex
**🔗 DEPENDENCIAS**: Función HTTP en Convex implementada
**⏱️ ESTIMACIÓN**: Complejidad Baja (1 hora)

#### SUBTAREAS:
##### P2.2.1 - Validar estructura de payload en Convex
- 🔍 **Análisis Técnico**: Verificar campos requeridos y tipos
- 🛠️ **Implementación MVP**: Validación con Convex validators
- 🧪 **Pruebas de Integración**: Enviar payloads inválidos y verificar rechazo
- 🔗 **Integraciones**: Convex v validators, error responses

## 🔵 TAREAS P3 (BAJAS - OPTIMIZACIONES)

### 📋 TAREA P3.1 - Cleanup de Código Legacy
**🎯 OBJETIVO**: Remover código innecesario después de implementar sync
**🔗 DEPENDENCIAS**: Sistema de sync completamente funcional
**⏱️ ESTIMACIÓN**: Complejidad Baja (1 hora)

#### SUBTAREAS:
##### P3.1.1 - Remover WebSocket connections legacy
- 🔍 **Análisis Técnico**: webSocketConnections.current ya no necesario
- 🛠️ **Implementación MVP**: Limpiar referencias a WebSocket
- 🧪 **Pruebas de Integración**: Verificar que app funciona sin WebSockets
- 🔗 **Integraciones**: usePersistentTranscription cleanup
