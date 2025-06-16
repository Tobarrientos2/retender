"""
Modelos de datos para la API de transcripción
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class TranscriptionRequest(BaseModel):
    """Modelo para request de transcripción"""
    audio_file_path: str = Field(..., description="Ruta del archivo de audio")
    language: Optional[str] = Field(None, description="Idioma del audio (None para auto-detección)")
    model: str = Field(default="large", description="Modelo Whisper a usar")
    return_timestamps: bool = Field(default=True, description="Incluir timestamps")
    temperature: float = Field(default=0.0, ge=0.0, le=1.0, description="Temperatura para transcripción")
    initial_prompt: Optional[str] = Field(None, description="Prompt inicial")


class TranscriptionSegment(BaseModel):
    """Segmento de transcripción con timestamps"""
    id: int = Field(..., description="ID del segmento")
    start: float = Field(..., description="Tiempo de inicio en segundos")
    end: float = Field(..., description="Tiempo de fin en segundos")
    text: str = Field(..., description="Texto transcrito")
    confidence: Optional[float] = Field(None, description="Confianza de la transcripción")


class AudioInfo(BaseModel):
    """Información del archivo de audio"""
    duration: float = Field(..., description="Duración en segundos")
    sample_rate: int = Field(..., description="Tasa de muestreo")
    channels: int = Field(..., description="Número de canales")
    format: str = Field(..., description="Formato del archivo")
    size_mb: float = Field(..., description="Tamaño en MB")


class TranscriptionResponse(BaseModel):
    """Respuesta de transcripción"""
    success: bool = Field(default=True, description="Indica si la transcripción fue exitosa")
    text: str = Field(..., description="Texto completo transcrito")
    language: str = Field(..., description="Idioma detectado/usado")
    model_used: str = Field(..., description="Modelo Whisper utilizado")
    
    # Información detallada
    segments: Optional[List[TranscriptionSegment]] = Field(None, description="Segmentos con timestamps")
    audio_info: AudioInfo = Field(..., description="Información del archivo de audio")
    
    # Metadatos de procesamiento
    processing_time: float = Field(..., description="Tiempo de procesamiento en segundos")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp de la transcripción")
    
    # Configuración usada
    config: Dict[str, Any] = Field(default_factory=dict, description="Configuración utilizada")


class HealthResponse(BaseModel):
    """Respuesta de health check"""
    status: str = Field(..., description="Estado del servicio")
    message: str = Field(..., description="Mensaje descriptivo")
    version: str = Field(..., description="Versión de la API")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp del check")


class ErrorResponse(BaseModel):
    """Respuesta de error"""
    error: str = Field(..., description="Tipo de error")
    detail: str = Field(..., description="Detalle del error")
    status_code: int = Field(..., description="Código de estado HTTP")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp del error")


class ModelInfo(BaseModel):
    """Información de modelo Whisper"""
    name: str = Field(..., description="Nombre del modelo")
    size: str = Field(..., description="Tamaño del modelo")
    description: str = Field(..., description="Descripción del modelo")
    languages: str = Field(..., description="Idiomas soportados")


class LanguageInfo(BaseModel):
    """Información de idioma soportado"""
    code: str = Field(..., description="Código del idioma")
    name: str = Field(..., description="Nombre del idioma")


class TranscriptionStats(BaseModel):
    """Estadísticas de transcripción"""
    total_transcriptions: int = Field(default=0, description="Total de transcripciones")
    total_audio_duration: float = Field(default=0.0, description="Duración total de audio procesado")
    average_processing_time: float = Field(default=0.0, description="Tiempo promedio de procesamiento")
    most_used_model: str = Field(default="large", description="Modelo más utilizado")
    most_detected_language: str = Field(default="es", description="Idioma más detectado")


class BatchTranscriptionRequest(BaseModel):
    """Request para transcripción en lote"""
    files: List[str] = Field(..., description="Lista de rutas de archivos")
    language: Optional[str] = Field(None, description="Idioma común (None para auto-detección)")
    model: str = Field(default="large", description="Modelo Whisper a usar")
    return_timestamps: bool = Field(default=True, description="Incluir timestamps")
    temperature: float = Field(default=0.0, ge=0.0, le=1.0, description="Temperatura")


class BatchTranscriptionResponse(BaseModel):
    """Respuesta de transcripción en lote"""
    success: bool = Field(default=True, description="Indica si el lote fue exitoso")
    total_files: int = Field(..., description="Total de archivos procesados")
    successful_transcriptions: int = Field(..., description="Transcripciones exitosas")
    failed_transcriptions: int = Field(..., description="Transcripciones fallidas")
    results: List[TranscriptionResponse] = Field(..., description="Resultados individuales")
    total_processing_time: float = Field(..., description="Tiempo total de procesamiento")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp del lote")


class TranscriptionProgress(BaseModel):
    """Progreso de transcripción en tiempo real"""
    task_id: str = Field(..., description="ID de la tarea")
    status: str = Field(..., description="Estado actual (processing, completed, failed)")
    progress: float = Field(..., ge=0.0, le=100.0, description="Progreso en porcentaje")
    message: str = Field(..., description="Mensaje de estado")
    estimated_time_remaining: Optional[float] = Field(None, description="Tiempo estimado restante")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp del progreso")
