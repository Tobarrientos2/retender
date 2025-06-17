# Product Requirements Document (PRD)
## API de Transcripción de Audio con Groq Cloud

## 🎯 OBJETIVO GENERAL
Desarrollar y deployar exitosamente una API de transcripción de audio de alta calidad usando Groq Cloud API (Whisper Large-v3 Turbo) en Koyeb Free Tier, con soporte WebSocket para progreso en tiempo real y disponibilidad 24/7 sin costos.

## 🏗️ ARQUITECTURA TARGET

### Diagrama de Arquitectura del Sistema
```mermaid
graph TB
    subgraph "Cliente"
        A[Frontend React/TS] --> B[Audio Upload]
        A --> C[WebSocket Client]
    end
    
    subgraph "Koyeb Free Tier"
        D[FastAPI Server] --> E[Audio Processor]
        D --> F[Groq Service]
        D --> G[WebSocket Manager]
        D --> H[Job Queue]
        
        E --> I[FFmpeg Processing]
        F --> J[Groq Cloud API]
        
        subgraph "Endpoints"
            K[/health - Health Check]
            L[/transcribe - Direct Transcription]
            M[/transcribe-job - Background Jobs]
            N[/ws/transcription/{id} - WebSocket]
        end
    end
    
    subgraph "External Services"
        O[Groq Cloud API]
        P[Whisper Large-v3 Turbo]
    end
    
    J --> O
    O --> P
    
    style D fill:#e1f5fe
    style F fill:#c8e6c9
    style O fill:#fff3e0
```

## ✅ SUCCESS CRITERIA

### Métricas Técnicas de Éxito
- **Deployment Status**: HEALTHY en Koyeb (no UNHEALTHY)
- **Health Check**: /health endpoint retorna 200 con JSON válido
- **Memory Usage**: < 400MB RAM (dentro de límite 512MB Free Tier)
- **Response Time**: < 30 segundos para archivos de 5MB
- **API Availability**: 99%+ uptime en Koyeb
- **Error Rate**: < 1% de transcripciones fallidas

### Métricas Funcionales de Éxito
- **Calidad de Transcripción**: Whisper Large-v3 Turbo quality
- **Formatos Soportados**: MP3, WAV, M4A, FLAC, OGG, WEBM, MP4
- **Tamaño Máximo**: 25MB por archivo
- **WebSocket**: Progreso en tiempo real funcional
- **Costo**: $0.00/mes (Free Tier compliant)

## 🎯 SCOPE MVP

### INCLUIDO EN MVP:
- ✅ **API Core**: FastAPI con endpoints esenciales
- ✅ **Transcripción**: Groq Cloud integration
- ✅ **Procesamiento**: FFmpeg audio processing
- ✅ **Health Checks**: Koyeb-compatible health endpoint
- ✅ **WebSocket**: Real-time progress updates
- ✅ **Job Queue**: Background processing
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Deployment**: Koyeb Free Tier optimization

### EXCLUIDO DEL MVP:
- ❌ **Authentication**: No auth required for MVP
- ❌ **Rate Limiting**: Groq provides 2000 requests/day
- ❌ **File Storage**: Temporary files only
- ❌ **Database**: In-memory job storage
- ❌ **Monitoring**: Basic logging only
- ❌ **Load Balancing**: Single instance on Free Tier

## 🔧 ESPECIFICACIONES TÉCNICAS

### Backend Specifications:
- **Runtime**: Python 3.11 (compatible with all dependencies)
- **Framework**: FastAPI 0.100+ with WebSocket support
- **Transcription**: Groq Cloud API (Whisper Large-v3 Turbo)
- **Audio Processing**: FFmpeg-python 0.2.0+ (no pydub dependency)
- **WebSocket**: Native FastAPI WebSocket + custom manager
- **Job Queue**: In-memory async queue with progress callbacks
- **Logging**: Loguru for structured logging

### Deployment Specifications:
- **Platform**: Koyeb Free Tier (512MB RAM, 0.1 vCPU)
- **Container**: Docker multi-stage build optimized for memory
- **Base Image**: python:3.11-slim
- **Health Check**: curl-based HTTP check on /health
- **Port**: 8000 (Koyeb standard)
- **Environment**: Production CORS configuration

### API Design:
- **REST Endpoints**: 
  - GET /health (Koyeb health check)
  - POST /transcribe (direct transcription)
  - POST /transcribe-job (background job)
  - GET /job/{id} (job status)
  - WebSocket /ws/transcription/{id}
- **Request Format**: multipart/form-data for audio files
- **Response Format**: JSON with structured data
- **Error Handling**: HTTP status codes + detailed error messages

### Performance Targets:
- **Memory Usage**: < 400MB peak (80% of 512MB limit)
- **Startup Time**: < 30 seconds (health check tolerance)
- **Processing Speed**: 10x faster than local Whisper (Groq advantage)
- **Concurrent Jobs**: 3-5 simultaneous (memory limited)

## 🚨 PROBLEMAS RESUELTOS

### Problema Original: OOM con pydub
- **Causa**: pydub requiere pyaudioop (no disponible en Python 3.13)
- **Solución**: Eliminación completa de pydub, solo FFmpeg
- **Resultado**: Reducción de 200MB+ en uso de memoria

### Problema de Health Check
- **Causa**: Health check usando requests (no en requirements)
- **Solución**: Cambio a curl en Dockerfile
- **Resultado**: Health check más eficiente y confiable

### Problema de Repositorio
- **Causa**: Repositorio privado, Koyeb sin acceso
- **Solución**: Repositorio público
- **Resultado**: Deployments automáticos funcionando

## 🎯 PRÓXIMOS PASOS POST-MVP

### Fase 2 - Optimizaciones:
- Implementar rate limiting inteligente
- Agregar métricas y monitoring
- Optimizar uso de memoria
- Implementar caching de resultados

### Fase 3 - Features Avanzadas:
- Soporte para múltiples idiomas simultáneos
- Integración con storage permanente
- API de administración
- Dashboard de métricas
