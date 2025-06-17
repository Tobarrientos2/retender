"""
FastAPI Audio Transcription Service
Servicio de transcripción de audio usando OpenAI Whisper
"""

import os
import tempfile
import asyncio
from pathlib import Path
from typing import Optional, List
import aiofiles

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, BackgroundTasks, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from loguru import logger

from services.transcription_service import TranscriptionService
from services.audio_processor import AudioProcessor
from services.job_queue_service import job_queue_service
from services.websocket_manager import websocket_manager
from models.transcription_models import (
    TranscriptionResponse,
    TranscriptionRequest,
    HealthResponse,
    ErrorResponse,
    JobSubmissionResponse,
    TranscriptionJob
)
# from utils.auth import verify_bearer_token

# Configuración de la aplicación
app = FastAPI(
    title="Audio Transcription API",
    description="API de transcripción de audio usando OpenAI Whisper",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuración CORS dinámica basada en entorno
import os

# Configuración CORS basada en entorno
if os.getenv("ENVIRONMENT") == "production":
    # Producción: CORS específico para dominios conocidos
    allowed_origins = [
        "https://*.koyeb.app",
        "https://localhost:5174",
        "https://localhost:3000"
    ]
    allow_credentials = True
else:
    # Desarrollo: CORS permisivo
    allowed_origins = ["*"]
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servicios globales
transcription_service = TranscriptionService()
audio_processor = AudioProcessor()

# Configuración de logging
logger.add("logs/api.log", rotation="1 day", retention="7 days", level="INFO")


@app.on_event("startup")
async def startup_event():
    """Inicializar servicios al arrancar la API"""
    logger.info("🚀 Iniciando Audio Transcription API")

    try:
        # Crear directorio de logs si no existe
        os.makedirs("logs", exist_ok=True)
        os.makedirs("temp", exist_ok=True)
        logger.info("📁 Directorios creados correctamente")

        # Verificar variables de entorno críticas
        groq_api_key = os.getenv("GROQ_API_KEY")
        if groq_api_key:
            logger.info("🔑 GROQ_API_KEY encontrada")
        else:
            logger.error("❌ GROQ_API_KEY no encontrada en variables de entorno")

        # Inicializar servicio de transcripción
        logger.info("🔄 Inicializando servicio de transcripción...")
        await transcription_service.initialize()
        logger.info("✅ Servicio de transcripción inicializado")

        # Inicializar job queue service
        logger.info("🔄 Inicializando job queue service...")
        await job_queue_service.start()
        logger.info("✅ Job queue service inicializado")

        # Verificar health check después de inicialización
        logger.info("🔍 Verificando health check post-inicialización...")
        is_healthy = await transcription_service.health_check()
        if is_healthy:
            logger.info("✅ Health check post-inicialización exitoso")
        else:
            logger.warning("⚠️ Health check post-inicialización falló")

        logger.info("✅ Todos los servicios inicializados correctamente")

    except Exception as e:
        logger.error(f"❌ Error durante startup: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Limpiar recursos al cerrar la API"""
    logger.info("🔄 Cerrando Audio Transcription API")

    # Detener job queue service
    await job_queue_service.stop()

    # Limpiar transcription service
    await transcription_service.cleanup()


@app.get("/", response_model=HealthResponse)
async def root():
    """Endpoint raíz con información de la API"""
    return HealthResponse(
        status="healthy",
        message="Audio Transcription API está funcionando",
        version="1.0.0"
    )


@app.get("/debug/status")
async def debug_status():
    """Endpoint de debug para verificar estado de inicialización"""
    from services.groq_transcription_service import groq_transcription_service

    status = {
        "api_version": "1.0.0",
        "groq_api_key_present": bool(os.getenv("GROQ_API_KEY")),
        "groq_client_initialized": groq_transcription_service.client is not None,
        "groq_api_key_format_valid": False,
        "transcription_service_healthy": False
    }

    # Verificar formato de API key
    api_key = os.getenv("GROQ_API_KEY")
    if api_key:
        status["groq_api_key_format_valid"] = api_key.startswith('gsk_')

    # Verificar health del servicio
    try:
        status["transcription_service_healthy"] = await transcription_service.health_check()
    except Exception as e:
        status["health_check_error"] = str(e)

    return status


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint - Retorna JSON válido con status 200"""
    logger.info("🔍 Health check - Retornando JSON válido para Koyeb")

    # Retornar JSON válido con status code 200 (2xx) que Koyeb requiere
    return HealthResponse(
        status="healthy",
        message="Servicio funcionando correctamente",
        version="1.0.0"
    )


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Archivo de audio a transcribir"),
    language: Optional[str] = Form(default="auto", description="Idioma del audio (auto, es, en, fr, etc.)"),
    model: Optional[str] = Form(default="whisper-large-v3-turbo", description="Modelo Whisper (whisper-large-v3-turbo)"),
    return_timestamps: bool = Form(default=True, description="Incluir timestamps en la transcripción"),
    temperature: float = Form(default=0.0, description="Temperatura para la transcripción (0.0-1.0)"),
    initial_prompt: Optional[str] = Form(default=None, description="Prompt inicial para mejorar la transcripción")
):
    """
    Transcribir archivo de audio usando OpenAI Whisper
    
    Formatos soportados: MP3, WAV, M4A, FLAC, OGG, WEBM, MP4
    Tamaño máximo: 25MB
    """
    
    # Validar archivo
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó archivo")
    
    # Validar tamaño (25MB máximo)
    max_size = 25 * 1024 * 1024  # 25MB
    file_size = 0
    
    try:
        # Crear archivo temporal
        temp_file_path = None
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            temp_file_path = temp_file.name
            
            # Leer archivo en chunks para validar tamaño
            while chunk := await file.read(8192):  # 8KB chunks
                file_size += len(chunk)
                if file_size > max_size:
                    os.unlink(temp_file_path)
                    raise HTTPException(
                        status_code=413, 
                        detail=f"Archivo demasiado grande. Máximo: {max_size // (1024*1024)}MB"
                    )
                temp_file.write(chunk)
        
        logger.info(f"📁 Archivo recibido: {file.filename} ({file_size / (1024*1024):.2f}MB)")
        
        # Procesar audio
        processed_audio_path = await audio_processor.process_audio_file(temp_file_path)
        
        # Crear request de transcripción
        transcription_request = TranscriptionRequest(
            audio_file_path=processed_audio_path,
            language=language if language != "auto" else None,
            model=model,
            return_timestamps=return_timestamps,
            temperature=temperature,
            initial_prompt=initial_prompt
        )
        
        # Transcribir
        result = await transcription_service.transcribe(transcription_request)
        
        # Programar limpieza de archivos temporales
        background_tasks.add_task(cleanup_temp_files, [temp_file_path, processed_audio_path])
        
        logger.info(f"✅ Transcripción completada para: {file.filename}")
        return result
        
    except HTTPException:
        # Re-lanzar HTTPExceptions
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        raise
        
    except Exception as e:
        # Limpiar archivos en caso de error
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        
        logger.error(f"❌ Error transcribiendo {file.filename}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error interno del servidor: {str(e)}"
        )


@app.post("/transcribe-simple")
async def transcribe_simple(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Archivo de audio a transcribir")
):
    """
    Endpoint simplificado para transcripción rápida
    Usa configuración por defecto: modelo large, español, con timestamps
    """
    
    # Reutilizar la lógica del endpoint principal
    return await transcribe_audio(
        background_tasks=background_tasks,
        file=file,
        language="es",
        model="large",
        return_timestamps=True,
        temperature=0.0,
        initial_prompt=None
    )


@app.get("/models")
async def get_available_models():
    """Obtener lista de modelos Whisper disponibles"""
    return {
        "models": [
            {
                "name": "whisper-large-v3-turbo",
                "size": "Cloud API",
                "description": "🚀 Groq Cloud: Whisper Large-v3 Turbo - Máxima calidad y velocidad extrema",
                "languages": "Multiidioma",
                "provider": "Groq Cloud",
                "daily_limit": "2000 requests",
                "features": ["Calidad Large-v3", "10x más rápido", "Sin límites de RAM", "Procesamiento en la nube"]
            }
        ]
    }


@app.get("/languages")
async def get_supported_languages():
    """Obtener lista de idiomas soportados"""
    return {
        "languages": [
            {"code": "auto", "name": "Detección automática"},
            {"code": "es", "name": "Español"},
            {"code": "en", "name": "Inglés"},
            {"code": "fr", "name": "Francés"},
            {"code": "de", "name": "Alemán"},
            {"code": "it", "name": "Italiano"},
            {"code": "pt", "name": "Portugués"},
            {"code": "ru", "name": "Ruso"},
            {"code": "ja", "name": "Japonés"},
            {"code": "ko", "name": "Coreano"},
            {"code": "zh", "name": "Chino"},
            {"code": "ar", "name": "Árabe"},
            {"code": "hi", "name": "Hindi"},
            # Agregar más idiomas según necesidad
        ]
    }


@app.post("/transcribe-job", response_model=JobSubmissionResponse)
async def submit_transcription_job(
    file: UploadFile = File(..., description="Archivo de audio a transcribir"),
    language: Optional[str] = Form(default="auto", description="Idioma del audio (auto, es, en, fr, etc.)"),
    model: Optional[str] = Form(default="whisper-large-v3-turbo", description="Modelo Whisper (whisper-large-v3-turbo)"),
    return_timestamps: bool = Form(default=True, description="Incluir timestamps en la transcripción"),
    temperature: float = Form(default=0.0, description="Temperatura para la transcripción (0.0-1.0)"),
    initial_prompt: Optional[str] = Form(default=None, description="Prompt inicial para mejorar la transcripción")
):
    """
    Enviar archivo de audio para transcripción en background

    Retorna un job_id y WebSocket URL para seguir el progreso
    """

    # Validar archivo
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó archivo")

    # Validar tamaño (25MB máximo)
    max_size = 25 * 1024 * 1024  # 25MB
    file_size = 0
    temp_file_path = None

    try:
        # Crear archivo temporal
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            temp_file_path = temp_file.name

            # Leer archivo en chunks para validar tamaño
            while chunk := await file.read(8192):  # 8KB chunks
                file_size += len(chunk)
                if file_size > max_size:
                    os.unlink(temp_file_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"Archivo demasiado grande. Máximo: {max_size // (1024*1024)}MB"
                    )
                temp_file.write(chunk)

        logger.info(f"📁 Archivo recibido para job: {file.filename} ({file_size / (1024*1024):.2f}MB)")

        # Procesar audio
        processed_audio_path = await audio_processor.process_audio_file(temp_file_path)

        # Crear request de transcripción
        transcription_request = TranscriptionRequest(
            audio_file_path=processed_audio_path,
            language=language if language != "auto" else None,
            model=model,
            return_timestamps=return_timestamps,
            temperature=temperature,
            initial_prompt=initial_prompt
        )

        # Crear callback de progreso para WebSocket
        async def progress_callback(job: TranscriptionJob):
            await websocket_manager.broadcast_progress(job)

            # Si está completado o falló, enviar mensaje final
            if job.status.value in ["completed", "failed", "cancelled"]:
                await websocket_manager.broadcast_completion(job)

        # Enviar job a la cola
        job_id = await job_queue_service.submit_job(
            processed_audio_path,
            transcription_request,
            progress_callback
        )

        # Crear URL del WebSocket dinámicamente
        # En desarrollo, usar localhost independientemente de HOST
        if os.getenv("ENVIRONMENT") == "production":
            # Koyeb proporciona HTTPS/WSS automáticamente
            host = os.getenv("HOST", "localhost")
            websocket_url = f"wss://{host}/ws/transcription/{job_id}"
        else:
            # Desarrollo local - siempre usar localhost
            port = os.getenv("PORT", "8000")
            websocket_url = f"ws://localhost:{port}/ws/transcription/{job_id}"

        # Estimar tiempo de procesamiento (aproximado)
        estimated_time = file_size / (1024 * 1024) * 30  # ~30 segundos por MB

        # Obtener posición en cola
        queue_info = await job_queue_service.get_queue_info()
        queue_position = queue_info["queue_size"]

        logger.info(f"✅ Job enviado: {job_id}")

        return JobSubmissionResponse(
            job_id=job_id,
            status="queued",
            websocket_url=websocket_url,
            estimated_processing_time=estimated_time,
            queue_position=queue_position
        )

    except HTTPException:
        # Re-lanzar HTTPExceptions
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        raise

    except Exception as e:
        # Limpiar archivos en caso de error
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

        logger.error(f"❌ Error enviando job para {file.filename}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor: {str(e)}"
        )


@app.get("/job/{job_id}", response_model=TranscriptionJob)
async def get_job_status(job_id: str):
    """Obtener estado de un job de transcripción"""
    job = await job_queue_service.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return job


@app.delete("/job/{job_id}")
async def cancel_job(job_id: str):
    """Cancelar un job de transcripción"""
    success = await job_queue_service.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return {"message": "Job cancelado exitosamente"}


@app.get("/queue/info")
async def get_queue_info():
    """Obtener información de la cola de jobs"""
    queue_info = await job_queue_service.get_queue_info()
    websocket_stats = websocket_manager.get_connection_stats()

    return {
        "queue": queue_info,
        "websockets": websocket_stats
    }


@app.websocket("/ws/transcription/{job_id}")
async def websocket_transcription_endpoint(websocket: WebSocket, job_id: str):
    """WebSocket endpoint para seguir progreso de transcripción"""
    await websocket_manager.connect(websocket, job_id)

    try:
        while True:
            # Recibir mensajes del cliente
            data = await websocket.receive_text()
            await websocket_manager.handle_websocket_message(websocket, data)

    except WebSocketDisconnect:
        await websocket_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"❌ Error en WebSocket {job_id}: {e}")
        await websocket_manager.disconnect(websocket)


async def cleanup_temp_files(file_paths: List[str]):
    """Limpiar archivos temporales"""
    for file_path in file_paths:
        try:
            if file_path and os.path.exists(file_path):
                os.unlink(file_path)
                logger.debug(f"🗑️ Archivo temporal eliminado: {file_path}")
        except Exception as e:
            logger.warning(f"⚠️ No se pudo eliminar archivo temporal {file_path}: {e}")


# Manejo global de errores
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"❌ Error no manejado: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Error interno del servidor",
            detail=str(exc),
            status_code=500
        ).dict()
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=9000,
        reload=True,
        log_level="info"
    )
