"""
Servicio de transcripción usando Groq Cloud API
Whisper Large-v3 Turbo con velocidad extrema y calidad máxima
"""

import os
import time
import tempfile
from typing import Optional, Dict, Any, Callable
from pathlib import Path

from groq import Groq
from loguru import logger

from models.transcription_models import (
    TranscriptionRequest,
    TranscriptionResponse,
    AudioInfo,
    TranscriptionSegment
)


class GroqTranscriptionService:
    """Servicio de transcripción usando Groq Cloud API"""
    
    def __init__(self):
        self.client = None
        self.api_key = None
        
    async def initialize(self):
        """Inicializar el servicio de transcripción Groq"""
        logger.info("🚀 Inicializando servicio de transcripción Groq Cloud...")

        # Obtener API key
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            logger.error("❌ GROQ_API_KEY no encontrada en variables de entorno")
            raise ValueError("❌ GROQ_API_KEY no encontrada en variables de entorno")

        # Inicializar cliente Groq
        try:
            self.client = Groq(api_key=self.api_key)
            logger.info("✅ Cliente Groq inicializado correctamente")
        except Exception as e:
            logger.error(f"❌ Error inicializando cliente Groq: {e}")
            raise

        # Verificar conexión básica
        try:
            logger.info("🔍 Verificando configuración de Groq Cloud...")
            # Verificación básica sin hacer llamadas a la API
            if self.client and self.api_key:
                logger.info("✅ Configuración de Groq Cloud verificada")
            else:
                raise ValueError("Cliente o API key no válidos")
        except Exception as e:
            logger.error(f"❌ Error en verificación de Groq Cloud: {e}")
            raise

        logger.info("✅ Servicio de transcripción Groq Cloud listo")

    async def health_check(self) -> bool:
        """
        Verificar que el servicio esté funcionando correctamente

        Returns:
            bool: True si el servicio está healthy, False en caso contrario
        """
        try:
            # Verificar que tenemos API key
            if not self.api_key:
                logger.warning("⚠️ Health check: API key no disponible")
                return False

            # Verificar que el cliente está inicializado
            if not self.client:
                logger.warning("⚠️ Health check: Cliente Groq no inicializado")
                return False

            # Verificar que la API key tiene formato válido
            if not self.api_key.startswith('gsk_'):
                logger.warning("⚠️ Health check: Formato de API key inválido")
                return False

            logger.info("✅ Health check: Servicio Groq Cloud healthy")
            return True

        except Exception as e:
            logger.error(f"❌ Health check falló: {e}")
            return False
    
    async def transcribe_audio(self, request: TranscriptionRequest) -> TranscriptionResponse:
        """
        Transcribir audio usando Groq Cloud API
        
        Args:
            request: Solicitud de transcripción
            
        Returns:
            TranscriptionResponse: Respuesta con la transcripción
        """
        logger.info(f"🎤 Iniciando transcripción con Groq Cloud - Archivo: {request.audio_file_path}")
        start_time = time.time()

        try:
            # Verificar que el archivo existe
            if not os.path.exists(request.audio_file_path):
                raise FileNotFoundError(f"Archivo no encontrado: {request.audio_file_path}")

            # Abrir archivo de audio
            with open(request.audio_file_path, "rb") as audio_file:
                logger.info("📤 Enviando audio a Groq Cloud...")
                
                # Llamada a Groq API
                transcription = self.client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-large-v3-turbo",  # Modelo más rápido y preciso
                    language=request.language if request.language != "auto" else None,
                    response_format="verbose_json" if request.return_timestamps else "json",
                    temperature=request.temperature
                )
                
            processing_time = time.time() - start_time
            logger.info(f"✅ Transcripción completada en {processing_time:.2f}s")
            
            # Procesar respuesta
            if request.return_timestamps and hasattr(transcription, 'segments'):
                # Con timestamps
                segments = []
                for i, segment in enumerate(transcription.segments):
                    # Manejar tanto objetos como diccionarios
                    if isinstance(segment, dict):
                        start = segment.get('start', 0.0)
                        end = segment.get('end', 0.0)
                        text = segment.get('text', '').strip()
                    else:
                        start = getattr(segment, 'start', 0.0)
                        end = getattr(segment, 'end', 0.0)
                        text = getattr(segment, 'text', '').strip()

                    segments.append(TranscriptionSegment(
                        id=i,
                        start=start,
                        end=end,
                        text=text
                    ))
                
                # Obtener información del audio
                audio_info = await self.get_audio_info(request.audio_file_path)

                return TranscriptionResponse(
                    text=transcription.text.strip(),
                    segments=segments,
                    language=getattr(transcription, 'language', request.language),
                    processing_time=processing_time,
                    model_used="whisper-large-v3-turbo-groq",
                    audio_info=audio_info
                )
            else:
                # Solo texto
                # Obtener información del audio
                audio_info = await self.get_audio_info(request.audio_file_path)

                return TranscriptionResponse(
                    text=transcription.text.strip(),
                    segments=None,
                    language=getattr(transcription, 'language', request.language),
                    processing_time=processing_time,
                    model_used="whisper-large-v3-turbo-groq",
                    audio_info=audio_info
                )
                
        except Exception as e:
            logger.error(f"❌ Error en transcripción Groq: {e}")
            raise Exception(f"Error en transcripción: {str(e)}")
    
    async def transcribe_with_progress(
        self,
        request: TranscriptionRequest,
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> TranscriptionResponse:
        """
        Transcribir con callback de progreso
        
        Args:
            request: Solicitud de transcripción
            progress_callback: Función para reportar progreso
            
        Returns:
            TranscriptionResponse: Respuesta con la transcripción
        """
        try:
            # Callback de progreso inicial
            if progress_callback:
                await progress_callback(0.0, "Iniciando transcripción con Groq Cloud...")
            
            if progress_callback:
                await progress_callback(20.0, "Preparando archivo de audio...")
            
            # Verificar archivo
            if not os.path.exists(request.audio_file_path):
                raise FileNotFoundError(f"Archivo no encontrado: {request.audio_file_path}")
            
            if progress_callback:
                await progress_callback(40.0, "Enviando a Groq Cloud...")
            
            # Transcribir
            result = await self.transcribe_audio(request)
            
            if progress_callback:
                await progress_callback(90.0, "Procesando respuesta...")
            
            if progress_callback:
                await progress_callback(100.0, "Transcripción completada")
            
            return result
            
        except Exception as e:
            if progress_callback:
                await progress_callback(-1.0, f"Error: {str(e)}")
            raise
    
    async def get_audio_info(self, file_path: str) -> AudioInfo:
        """Obtener información del archivo de audio"""
        try:
            import ffmpeg
            
            # Obtener información usando ffprobe
            probe = ffmpeg.probe(file_path)
            audio_stream = next(
                (stream for stream in probe['streams'] if stream['codec_type'] == 'audio'),
                None
            )
            
            if not audio_stream:
                raise ValueError("No se encontró stream de audio en el archivo")
            
            duration = float(audio_stream.get('duration', 0))
            sample_rate = int(audio_stream.get('sample_rate', 0))
            channels = int(audio_stream.get('channels', 0))

            # Calcular tamaño del archivo en MB
            file_size_bytes = os.path.getsize(file_path)
            size_mb = file_size_bytes / (1024 * 1024)

            return AudioInfo(
                duration=duration,
                sample_rate=sample_rate,
                channels=channels,
                format=audio_stream.get('codec_name', 'unknown'),
                size_mb=size_mb
            )
            
        except Exception as e:
            logger.warning(f"⚠️ No se pudo obtener info del audio: {e}")
            # Calcular tamaño del archivo como fallback
            try:
                file_size_bytes = os.path.getsize(file_path)
                size_mb = file_size_bytes / (1024 * 1024)
            except:
                size_mb = 0.0

            return AudioInfo(
                duration=0.0,
                sample_rate=16000,
                channels=1,
                format="unknown",
                size_mb=size_mb
            )
    
    def get_available_models(self) -> list:
        """Obtener lista de modelos disponibles en Groq"""
        return [
            {
                "name": "whisper-large-v3-turbo",
                "size": "Cloud API",
                "description": "🚀 Groq Cloud: Whisper Large-v3 Turbo - Máxima calidad y velocidad",
                "languages": "Multiidioma",
                "provider": "Groq Cloud"
            }
        ]


# Instancia global del servicio
groq_transcription_service = GroqTranscriptionService()
