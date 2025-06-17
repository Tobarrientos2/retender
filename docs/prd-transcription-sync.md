# Product Requirements Document (PRD)
## Sistema de Transcripción Persistente - Sincronización API ↔ Convex

## 🎯 OBJETIVO GENERAL
Resolver la desincronización crítica entre la API Python (FastAPI) y Convex Database que causa que las transcripciones completadas permanezcan marcadas como "en progreso" en el frontend React, implementando sincronización automática de estados entre sistemas distribuidos.

## 🏗️ ARQUITECTURA TARGET

### Arquitectura Actual (Problemática)
- **Frontend**: React + TypeScript con hook `usePersistentTranscription`
- **Backend**: FastAPI Python con job queue service y Groq Cloud
- **Database**: Convex para persistencia de jobs
- **Problema**: Dos fuentes de verdad desincronizadas

### Arquitectura Target (Solucionada)
- **API Python**: Integración directa con Convex HTTP API para sincronización
- **Convex**: Funciones HTTP para recibir actualizaciones de la API
- **Frontend**: Reactivo automático a cambios en Convex (sin polling excesivo)
- **Comunicación**: API → Convex HTTP → Database → Frontend (flujo unidireccional)

## ✅ SUCCESS CRITERIA

### Criterios Técnicos de Éxito
1. **Sincronización Automática**: Jobs completados en API se reflejan inmediatamente en Convex
2. **Estado Consistente**: Frontend muestra estado real sin discrepancias
3. **Performance**: Reducción de polling innecesario (de 2s a 10s o eliminación)
4. **Robustez**: Manejo de errores de red y reintentos automáticos
5. **Timestamps Precisos**: Creación y finalización con timestamps exactos

### Métricas de Éxito
- **Latencia de Sincronización**: < 1 segundo desde completado hasta UI actualizada
- **Precisión de Estado**: 100% consistencia entre API y frontend
- **Reducción de Requests**: 80% menos polling requests
- **Error Rate**: < 1% fallos de sincronización

## 🎯 SCOPE MVP

### INCLUIDO EN MVP:
- **Convex HTTP API**: Endpoint para recibir actualizaciones de jobs
- **API Python Client**: Cliente Convex para enviar actualizaciones
- **Sincronización Automática**: Jobs completed/failed se sincronizan automáticamente
- **Manejo de Errores**: Reintentos y logging de fallos de sincronización
- **Timestamps Precisos**: createdAt, startedAt, completedAt sincronizados
- **Backward Compatibility**: Sistema actual sigue funcionando durante transición

### EXCLUIDO DEL MVP:
- **Real-time WebSockets**: Mantener polling reducido por simplicidad
- **Batch Updates**: Sincronización individual por job
- **Advanced Retry Logic**: Reintentos simples, no exponential backoff
- **Metrics Dashboard**: Logging básico, no dashboard de métricas

## 🔧 ESPECIFICACIONES TÉCNICAS

### Frontend Specifications:
- **Framework**: React 18+ con TypeScript 5.x
- **State Management**: Convex React hooks (useQuery, useMutation)
- **HTTP Client**: Fetch API nativo
- **Error Handling**: Try-catch con logging a console
- **Performance**: Polling reducido de 2s a 10s o eliminado

### Backend Specifications:
- **Runtime**: Python 3.11+ con FastAPI
- **HTTP Client**: httpx para llamadas a Convex
- **Job Queue**: Mantener job_queue_service actual
- **Error Handling**: Reintentos con timeout de 5s
- **Logging**: Structured logging con timestamps

### Database Specifications:
- **Convex Schema**: Mantener schema actual de transcriptionJobs
- **HTTP Functions**: Nuevas funciones para recibir updates de API
- **Indexing**: Mantener índices existentes por jobId y userId
- **Validation**: Validación de jobId y userId en updates

### Integration Specifications:
- **API → Convex**: HTTP POST con JSON payload
- **Authentication**: Convex HTTP API key para autenticación
- **Payload Format**: {jobId, status, progress, result, timestamps}
- **Error Handling**: HTTP status codes y retry logic

## 📊 DIAGRAMAS DE ARQUITECTURA

### Flujo de Sincronización Target:
```
1. API completa job → 2. Llama Convex HTTP → 3. Actualiza DB → 4. Frontend reactivo
```

### Componentes Afectados:
- **API**: job_queue_service.py (agregar sync call)
- **Convex**: transcriptionJobs.ts (nueva función HTTP)
- **Frontend**: usePersistentTranscription.ts (reducir polling)

## 🔄 PLAN DE MIGRACIÓN

### Fase 1: Implementación Base
- Crear función HTTP en Convex
- Implementar cliente Convex en API
- Agregar sync call en job completion

### Fase 2: Testing & Validation
- Pruebas de integración end-to-end
- Validación de sincronización en diferentes escenarios
- Performance testing con múltiples jobs

### Fase 3: Optimización
- Reducir frecuencia de polling
- Implementar error handling robusto
- Cleanup de código legacy

## 🚨 RIESGOS IDENTIFICADOS

### Riesgos Técnicos:
1. **Network Failures**: Convex HTTP API no disponible
2. **Authentication Issues**: API key inválida o expirada
3. **Race Conditions**: Updates simultáneos desde API y frontend
4. **Performance Impact**: Latencia adicional en job completion

### Mitigaciones:
1. **Retry Logic**: 3 reintentos con timeout
2. **Fallback**: Mantener polling como backup
3. **Validation**: Verificar jobId existe antes de update
4. **Monitoring**: Logging detallado de sync operations
