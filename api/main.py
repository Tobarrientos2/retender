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

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from loguru import logger

from services.transcription_service import TranscriptionService
from services.audio_processor import AudioProcessor
from models.transcription_models import (
    TranscriptionResponse,
    TranscriptionRequest,
    HealthResponse,
    ErrorResponse
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

# Configuración CORS para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
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
    
    # Crear directorio de logs si no existe
    os.makedirs("logs", exist_ok=True)
    os.makedirs("temp", exist_ok=True)
    
    # Inicializar modelo Whisper
    await transcription_service.initialize()
    logger.info("✅ Servicios inicializados correctamente")


@app.on_event("shutdown")
async def shutdown_event():
    """Limpiar recursos al cerrar la API"""
    logger.info("🔄 Cerrando Audio Transcription API")
    await transcription_service.cleanup()


@app.get("/", response_model=HealthResponse)
async def root():
    """Endpoint raíz con información de la API"""
    return HealthResponse(
        status="healthy",
        message="Audio Transcription API está funcionando",
        version="1.0.0"
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    is_healthy = await transcription_service.health_check()
    
    if not is_healthy:
        raise HTTPException(status_code=503, detail="Servicio no disponible")
    
    return HealthResponse(
        status="healthy",
        message="Todos los servicios funcionando correctamente",
        version="1.0.0"
    )


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Archivo de audio a transcribir"),
    language: Optional[str] = Form(default="auto", description="Idioma del audio (auto, es, en, fr, etc.)"),
    model: Optional[str] = Form(default="large", description="Modelo Whisper (tiny, base, small, medium, large)"),
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
                "name": "tiny",
                "size": "39 MB",
                "description": "Más rápido, menor precisión",
                "languages": "Multiidioma"
            },
            {
                "name": "base", 
                "size": "74 MB",
                "description": "Equilibrio entre velocidad y precisión",
                "languages": "Multiidioma"
            },
            {
                "name": "small",
                "size": "244 MB", 
                "description": "Buena precisión, velocidad moderada",
                "languages": "Multiidioma"
            },
            {
                "name": "medium",
                "size": "769 MB",
                "description": "Alta precisión, más lento",
                "languages": "Multiidioma"
            },
            {
                "name": "large",
                "size": "1550 MB",
                "description": "Máxima precisión, más lento",
                "languages": "Multiidioma"
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
