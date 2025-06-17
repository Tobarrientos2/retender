"""
Servicio de transcripción usando OpenAI Whisper
"""

import os
import time
import asyncio
from typing import Optional, Dict, Any, Callable
from pathlib import Path

from loguru import logger

from models.transcription_models import (
    TranscriptionRequest,
    TranscriptionResponse,
    TranscriptionSegment,
    AudioInfo
)
from services.groq_transcription_service import groq_transcription_service


class TranscriptionService:
    """Servicio de transcripción de audio usando Whisper"""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.current_model_name: Optional[str] = None
        # Config flags
        self.use_faster_whisper = True  # Local CPU/GPU inference
        self.use_openai_api = False  # Usar solo modelo local
        
    async def initialize(self):
        """Inicializar el servicio de transcripción"""
        logger.info("🔄 Inicializando servicio de transcripción...")

        # Inicializar Groq Cloud API (Whisper Large-v3 Turbo)
        await groq_transcription_service.initialize()

        logger.info("✅ Servicio de transcripción inicializado")
    
    async def load_model(self, model_name: str = "base") -> bool:
        """
        Cargar modelo Whisper
        
        Args:
            model_name: Nombre del modelo (tiny, base, small, medium, large)
            
        Returns:
            bool: True si se cargó correctamente
        """
        # Si usamos la API de OpenAI no cargamos modelos locales
        if self.use_openai_api:
            logger.info("🔗 Configurado para usar OpenAI Whisper API – no se cargan modelos locales")
            return True
        
        try:
            if model_name in self.models:
                logger.info(f"📦 Modelo {model_name} ya está cargado")
                return True
            
            logger.info(f"📥 Cargando modelo Whisper: {model_name}")
            start_time = time.time()
            
            # Con Groq Cloud no necesitamos cargar modelos localmente
            logger.info(f"📦 Modelo Groq Cloud configurado: {model_name}")
            # Simular modelo cargado para compatibilidad
            self.models[model_name] = "groq_cloud_model"
            self.current_model_name = model_name
            
            load_time = time.time() - start_time
            logger.info(f"✅ Modelo {model_name} cargado en {load_time:.2f}s")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error cargando modelo {model_name}: {e}")
            return False
    
    async def transcribe(self, request: TranscriptionRequest) -> TranscriptionResponse:
        """
        Transcribir archivo de audio usando Groq Cloud API

        Args:
            request: Request de transcripción

        Returns:
            TranscriptionResponse: Resultado de la transcripción
        """
        logger.info(f"🎤 Iniciando transcripción con Groq Cloud - Archivo: {Path(request.audio_file_path).name}")

        try:
            # Usar Groq Cloud API para transcripción
            response = await groq_transcription_service.transcribe_audio(request)

            logger.info(f"✅ Transcripción completada en {response.processing_time:.2f}s")
            return response

        except Exception as e:
            logger.error(f"❌ Error en transcripción: {e}")
            raise Exception(f"Error en transcripción: {str(e)}")
    
    async def _transcribe_faster_whisper(self, model: Any, request: TranscriptionRequest) -> Dict[str, Any]:
        """Transcribir usando faster-whisper"""
        
        # Configurar parámetros
        transcribe_params = {
            "language": request.language,
            "temperature": request.temperature,
            "initial_prompt": request.initial_prompt,
        }
        
        # Remover parámetros None
        transcribe_params = {k: v for k, v in transcribe_params.items() if v is not None}
        
        # Transcribir
        segments, info = model.transcribe(
            request.audio_file_path,
            **transcribe_params
        )
        
        # Procesar resultados
        text_segments = []
        full_text = ""
        
        for i, segment in enumerate(segments):
            segment_data = TranscriptionSegment(
                id=i,
                start=segment.start,
                end=segment.end,
                text=segment.text.strip(),
                confidence=getattr(segment, 'avg_logprob', None)
            )
            text_segments.append(segment_data)
            full_text += segment.text.strip() + " "
        
        return {
            "text": full_text.strip(),
            "language": info.language,
            "segments": text_segments if request.return_timestamps else []
        }
    

    
    async def _get_audio_info(self, file_path: str) -> AudioInfo:
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
                raise Exception("No se encontró stream de audio")
            
            duration = float(audio_stream.get('duration', 0))
            sample_rate = int(audio_stream.get('sample_rate', 0))
            channels = int(audio_stream.get('channels', 1))
            
            # Obtener tamaño del archivo
            file_size = os.path.getsize(file_path)
            size_mb = file_size / (1024 * 1024)
            
            # Obtener formato
            format_name = probe['format']['format_name']
            
            return AudioInfo(
                duration=duration,
                sample_rate=sample_rate,
                channels=channels,
                format=format_name,
                size_mb=round(size_mb, 2)
            )
            
        except Exception as e:
            logger.warning(f"⚠️ No se pudo obtener info de audio: {e}")
            # Fallback con información básica
            file_size = os.path.getsize(file_path)
            return AudioInfo(
                duration=0.0,
                sample_rate=16000,
                channels=1,
                format="unknown",
                size_mb=round(file_size / (1024 * 1024), 2)
            )
    
    async def health_check(self) -> bool:
        """Verificar que el servicio esté funcionando"""
        try:
            # Verificar que el servicio Groq esté healthy
            is_groq_healthy = await groq_transcription_service.health_check()

            if not is_groq_healthy:
                logger.warning("⚠️ Servicio Groq no está healthy")
                return False

            logger.info("✅ Servicio de transcripción healthy")
            return True

        except Exception as e:
            logger.error(f"❌ Health check falló: {e}")
            return False
    
    async def transcribe_with_progress(
        self,
        request: TranscriptionRequest,
        progress_callback: Optional[Callable] = None
    ) -> TranscriptionResponse:
        """
        Transcribir audio con callbacks de progreso usando Groq Cloud
        """
        try:
            # Usar Groq Cloud API con progreso
            response = await groq_transcription_service.transcribe_with_progress(
                request, progress_callback
            )

            logger.info(f"✅ Transcripción con progreso completada en {response.processing_time:.2f}s")
            return response

        except Exception as e:
            if progress_callback:
                await progress_callback(-1.0, f"Error: {str(e)}")
            logger.error(f"❌ Error en transcripción con progreso: {e}")
            raise Exception(f"Error en transcripción: {str(e)}")

    async def _transcribe_faster_whisper_with_progress(
        self,
        model: Any,
        request: TranscriptionRequest,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Transcribir usando faster-whisper con callbacks de progreso"""

        # Configurar parámetros
        transcribe_params = {
            "language": request.language,
            "temperature": request.temperature,
            "initial_prompt": request.initial_prompt,
        }

        # Remover parámetros None
        transcribe_params = {k: v for k, v in transcribe_params.items() if v is not None}

        if progress_callback:
            await progress_callback(40.0, "Iniciando transcripción del modelo...")

        # Transcribir (faster-whisper no tiene callbacks nativos, simulamos progreso)
        segments, info = model.transcribe(
            request.audio_file_path,
            **transcribe_params
        )

        # Procesar resultados con progreso simulado
        text_segments = []
        full_text = ""

        # Convertir generator a lista para poder calcular progreso
        segments_list = list(segments)
        total_segments = len(segments_list)

        for i, segment in enumerate(segments_list):
            # Calcular progreso (40% - 80%)
            segment_progress = 40.0 + ((i + 1) / total_segments) * 40.0

            if progress_callback and i % 5 == 0:  # Actualizar cada 5 segmentos
                await progress_callback(
                    segment_progress,
                    f"Procesando segmento {i + 1}/{total_segments}"
                )

            segment_data = TranscriptionSegment(
                id=i,
                start=segment.start,
                end=segment.end,
                text=segment.text.strip(),
                confidence=getattr(segment, 'avg_logprob', None)
            )
            text_segments.append(segment_data)
            full_text += segment.text.strip() + " "

        if progress_callback:
            await progress_callback(80.0, "Transcripción del modelo completada")

        return {
            "text": full_text.strip(),
            "language": info.language,
            "segments": text_segments if request.return_timestamps else []
        }

    async def cleanup(self):
        """Limpiar recursos"""
        logger.info("🔄 Limpiando recursos del servicio de transcripción")

        # Limpiar modelos cargados
        self.models.clear()
        self.current_model_name = None

        logger.info("✅ Recursos limpiados")
    
    def get_loaded_models(self) -> list:
        """Obtener lista de modelos cargados"""
        return list(self.models.keys())
    
    def get_current_model(self) -> Optional[str]:
        """Obtener modelo actual"""
        return self.current_model_name
